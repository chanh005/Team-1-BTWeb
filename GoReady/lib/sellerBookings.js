import { SellerError } from './seller.js';

// Booking của khách đặt vào tour của người bán. Seller được xác định qua tours.seller_id.
//
// Trạng thái phía người bán: pending → confirmed → completed, hoặc rejected / cancelled.
// Booking cũ có status 'upcoming' hoặc rỗng được coi là pending. "Đang diễn ra" không lưu trong DB: đó là booking
// confirmed mà hôm nay nằm giữa ngày khởi hành và ngày kết thúc (ngày đi + số ngày - 1).

const FILTERS = ['pending', 'confirmed', 'ongoing', 'completed', 'rejected', 'cancelled', 'closed'];

export const TODAY_SQL = `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

// Bảng tạm: mỗi booking của seller kèm trạng thái chuẩn hóa và ngày đi / ngày kết thúc
export const BASE_SQL = `
  SELECT b.id, b."bookingCode", b."tourId", b.adults, b.children, b.infants, b."totalPrice", b."contactName", b."contactPhone",
         b."contactEmail", b.note, b."createdAt", b.seller_note, b.confirmed_at, b.completed_at, b.departure_id,
         t.name AS tour_name, t.duration,
         d.max_seats, d.booked_seats,
         CASE WHEN b.status IS NULL OR b.status = 'upcoming' THEN 'pending' ELSE b.status END AS status,
         COALESCE(d.departure_date, CASE WHEN b."departureDate" ~ '^\\d{4}-\\d{2}-\\d{2}' THEN LEFT(b."departureDate", 10)::date END) AS start_date
  FROM bookings b
  JOIN tours t ON t.id = b."tourId"
  LEFT JOIN tour_departures d ON d.id = b.departure_id
  WHERE t.seller_id = $1`;

export const withDates = (inner) => `
  SELECT x.*, to_char(x.start_date, 'YYYY-MM-DD') AS start_str,
         to_char(x.start_date + GREATEST(COALESCE(x.duration, 1) - 1, 0), 'YYYY-MM-DD') AS end_str,
         (x.status = 'confirmed' AND x.start_date <= ${TODAY_SQL} AND x.start_date + GREATEST(COALESCE(x.duration, 1) - 1, 0) >= ${TODAY_SQL}) AS ongoing,
         (x.status = 'confirmed' AND x.start_date + GREATEST(COALESCE(x.duration, 1) - 1, 0) < ${TODAY_SQL}) AS can_complete
  FROM (${inner}) x`;

export function shape(r) {
  const remaining = r.max_seats === null || r.max_seats === undefined ? null : r.max_seats - r.booked_seats;
  return {
    id: r.id, bookingCode: r.bookingCode, tourId: r.tourId, tour_name: r.tour_name, status: r.status, ongoing: r.ongoing,
    start_date: r.start_str, end_date: r.end_str, adults: r.adults ?? 0, children: r.children ?? 0, infants: r.infants ?? 0,
    totalPrice: r.totalPrice, contactName: r.contactName, contactPhone: r.contactPhone, contactEmail: r.contactEmail,
    note: r.note, seller_note: r.seller_note, createdAt: r.createdAt, confirmed_at: r.confirmed_at, completed_at: r.completed_at,
    departure_id: r.departure_id, max_seats: r.max_seats ?? null, booked_seats: r.booked_seats ?? null, remaining_seats: remaining,
    can_complete: r.can_complete,
  };
}

export async function listSellerBookings(pool, sellerId, status) {
  if (status && !FILTERS.includes(status)) throw new SellerError('Trạng thái không hợp lệ');
  const { rows } = await pool.query(`${withDates(BASE_SQL)} ORDER BY x."createdAt" DESC`, [sellerId]);
  const all = rows.map(shape);

  // Mỗi booking thuộc đúng một nhóm đếm: chờ xác nhận / đã xác nhận (chưa đi) / đang diễn ra / hoàn thành / đã hủy-từ chối
  const counts = { pending: 0, confirmed: 0, ongoing: 0, completed: 0, closed: 0 };
  for (const b of all) {
    if (b.status === 'pending') counts.pending++;
    else if (b.status === 'confirmed') counts[b.ongoing ? 'ongoing' : 'confirmed']++;
    else if (b.status === 'completed') counts.completed++;
    else counts.closed++;
  }
  const match = (b) => {
    if (!status) return true;
    if (status === 'closed') return b.status === 'rejected' || b.status === 'cancelled';
    if (status === 'ongoing') return b.status === 'confirmed' && b.ongoing;
    if (status === 'confirmed') return b.status === 'confirmed' && !b.ongoing;
    return b.status === status;
  };
  return { bookings: all.filter(match), counts };
}

export async function getSellerBooking(pool, sellerId, bookingId) {
  const { rows } = await pool.query(`${withDates(BASE_SQL + ' AND b.id = $2')}`, [sellerId, bookingId]);
  if (!rows[0]) throw new SellerError('Không tìm thấy booking', 404);
  return shape(rows[0]);
}

const dmy = (s) => (s ? s.split('-').reverse().join('/') : '');
const STATUS_TEXT = { pending: 'chờ xác nhận', confirmed: 'đã xác nhận', completed: 'đã hoàn thành', rejected: 'đã bị từ chối', cancelled: 'đã bị hủy' };

/** Khóa dòng booking (chỉ khi thuộc tour của seller) trong transaction đang mở. */
async function lockBooking(client, sellerId, bookingId) {
  const { rows } = await client.query(
    `SELECT b.id, b."tourId", b.adults, b.children, b.departure_id,
            CASE WHEN b.status IS NULL OR b.status = 'upcoming' THEN 'pending' ELSE b.status END AS status
     FROM bookings b JOIN tours t ON t.id = b."tourId"
     WHERE b.id = $1 AND t.seller_id = $2 FOR UPDATE OF b`,
    [bookingId, sellerId],
  );
  if (!rows[0]) throw new SellerError('Không tìm thấy booking', 404);
  return rows[0];
}

async function inTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Xác nhận: kiểm tra lại số chỗ của ngày khởi hành (khóa dòng bằng FOR UPDATE) rồi cộng booked_seats.
 * Chỉ chạy được khi booking đang pending nên bấm hai lần không trừ chỗ hai lần.
 */
export async function confirmSellerBooking(pool, sellerId, bookingId, note) {
  await inTransaction(pool, async (client) => {
    const b = await lockBooking(client, sellerId, bookingId);
    if (b.status !== 'pending') throw new SellerError(`Chỉ xác nhận được booking đang chờ xác nhận (booking này ${STATUS_TEXT[b.status] ?? b.status})`, 409);
    if (!b.departure_id) throw new SellerError('Booking này chưa gắn với ngày khởi hành nên không thể kiểm tra và trừ chỗ', 409);

    const { rows } = await client.query('SELECT max_seats, booked_seats FROM tour_departures WHERE id = $1 AND tour_id = $2 FOR UPDATE', [b.departure_id, b.tourId]);
    const dep = rows[0];
    if (!dep) throw new SellerError('Ngày khởi hành của booking không còn tồn tại', 409);
    const guests = (b.adults ?? 0) + (b.children ?? 0);
    const remaining = dep.max_seats - dep.booked_seats;
    if (guests > remaining) throw new SellerError(`Không đủ chỗ: ngày này còn ${remaining} chỗ, booking cần ${guests} chỗ`, 409);

    await client.query('UPDATE tour_departures SET booked_seats = booked_seats + $2 WHERE id = $1', [b.departure_id, guests]);
    await client.query(
      `UPDATE bookings SET status = 'confirmed', confirmed_at = NOW(), seller_note = $2 WHERE id = $1`,
      [bookingId, String(note ?? '').trim() || null],
    );
  });
  return getSellerBooking(pool, sellerId, bookingId);
}

/** Từ chối: bắt buộc có lý do (gửi cho khách), không đụng tới số chỗ. */
export async function rejectSellerBooking(pool, sellerId, bookingId, reason) {
  const text = String(reason ?? '').trim();
  if (!text) throw new SellerError('Vui lòng nhập lý do từ chối', 422, { seller_note: 'Vui lòng nhập lý do từ chối' });
  await inTransaction(pool, async (client) => {
    const b = await lockBooking(client, sellerId, bookingId);
    if (b.status !== 'pending') throw new SellerError(`Chỉ từ chối được booking đang chờ xác nhận (booking này ${STATUS_TEXT[b.status] ?? b.status})`, 409);
    await client.query(`UPDATE bookings SET status = 'rejected', seller_note = $2 WHERE id = $1`, [bookingId, text]);
  });
  return getSellerBooking(pool, sellerId, bookingId);
}

/** Hoàn thành: chỉ khi đã xác nhận và đã qua ngày kết thúc tour (ngày đi + số ngày - 1). */
export async function completeSellerBooking(pool, sellerId, bookingId) {
  await inTransaction(pool, async (client) => {
    const b = await lockBooking(client, sellerId, bookingId);
    if (b.status !== 'confirmed') throw new SellerError(`Chỉ hoàn thành được booking đã xác nhận (booking này ${STATUS_TEXT[b.status] ?? b.status})`, 409);
    const { rows } = await client.query(`${withDates(BASE_SQL + ' AND b.id = $2')}`, [sellerId, bookingId]);
    if (!rows[0]?.can_complete) {
      throw new SellerError(`Chỉ đánh dấu hoàn thành sau ngày kết thúc tour${rows[0]?.end_str ? ` (${dmy(rows[0].end_str)})` : ''}`, 409);
    }
    await client.query(`UPDATE bookings SET status = 'completed', completed_at = NOW() WHERE id = $1`, [bookingId]);
  });
  return getSellerBooking(pool, sellerId, bookingId);
}
