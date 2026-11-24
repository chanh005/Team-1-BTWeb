import { randomUUID } from 'node:crypto';

export async function listBookings(pool) {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY "createdAt" DESC');
  return rows;
}

// Cột của bookings mà người mua được phép gửi lên (mọi khóa khác bị bỏ qua)
const BOOKING_COLUMNS = [
  'id', 'bookingCode', 'tourId', 'departureDate', 'departureCode', 'adults', 'children', 'infants', 'addOns', 'contactName',
  'contactPhone', 'contactEmail', 'note', 'totalPrice', 'paymentMethod', 'status', 'createdAt', 'guideName', 'guidePhone',
  'hotelName', 'pickupTime', 'pickupLocation',
];

const todayVN = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

/**
 * Tour của người bán (có seller_id): booking luôn bắt đầu ở 'pending' và gắn với một ngày khởi hành thật
 * (tour_departures, mã đoàn dạng "SD-<id>"). Số chỗ KHÔNG bị trừ lúc đặt: chỉ trừ khi người bán xác nhận.
 * Tour khác (tour cũ / Admin tạo): giữ nguyên cách làm cũ.
 */
async function applySellerRules(pool, row) {
  const { rows } = await pool.query('SELECT seller_id FROM tours WHERE id = $1', [row.tourId]);
  if (!rows[0]?.seller_id) return {};

  const m = String(row.departureCode ?? '').match(/^SD-(\d+)$/);
  if (!m) throw conflict('Vui lòng chọn một ngày khởi hành của tour');
  const { rows: deps } = await pool.query(
    `SELECT id, to_char(departure_date, 'YYYY-MM-DD') AS date, max_seats, booked_seats,
            to_char(booking_deadline, 'YYYY-MM-DD') AS deadline
     FROM tour_departures WHERE id = $1 AND tour_id = $2`,
    [Number(m[1]), row.tourId],
  );
  const dep = deps[0];
  const today = todayVN();
  if (!dep || dep.date < today) throw conflict('Ngày khởi hành này không còn mở đặt');
  if (dep.deadline && dep.deadline < today) throw conflict('Đã hết hạn nhận booking cho ngày khởi hành này');
  const guests = (Number(row.adults) || 0) + (Number(row.children) || 0);
  if (guests > dep.max_seats - dep.booked_seats) throw conflict('Ngày khởi hành này không còn đủ chỗ cho số khách bạn chọn');

  return { departure_id: dep.id, departureDate: dep.date, status: 'pending' };
}

export async function createBooking(pool, body) {
  const id = body.id || `booking-${randomUUID()}`;
  const row = { addOns: body.addOns ?? [], note: body.note ?? null };
  for (const c of BOOKING_COLUMNS) if (body[c] !== undefined && !(c in row)) row[c] = body[c];
  row.id = id;
  Object.assign(row, await applySellerRules(pool, row));

  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => (c === 'addOns' ? JSON.stringify(row[c]) : row[c]));
  await pool.query(`INSERT INTO bookings (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);

  // Keep the account's totalBookings count in sync, if the contact email matches a registered user.
  await pool.query('UPDATE users SET "totalBookings" = "totalBookings" + 1 WHERE lower(email) = lower($1)', [row.contactEmail]);

  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0];
}

export async function updateBookingStatus(pool, id, status) {
  const { rows: existing } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  const current = existing[0];
  if (!current) return null;

  // Booking của tour người bán có chỗ được tính trên ngày khởi hành: chỉ người bán được xác nhận / từ chối / hoàn thành
  // (qua /api/seller/bookings). Ở đây chỉ cho hủy; hủy booking đã xác nhận thì trả chỗ về ngày khởi hành.
  if (current.departure_id) {
    if (status !== 'cancelled') throw conflict('Booking này do người bán quản lý: chỉ có thể hủy tại đây');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT status, adults, children, departure_id FROM bookings WHERE id = $1 FOR UPDATE', [id]);
      const b = rows[0];
      if (b.status === 'confirmed') {
        await client.query('SELECT 1 FROM tour_departures WHERE id = $1 FOR UPDATE', [b.departure_id]);
        await client.query(
          'UPDATE tour_departures SET booked_seats = GREATEST(booked_seats - $2, 0) WHERE id = $1',
          [b.departure_id, (b.adults ?? 0) + (b.children ?? 0)],
        );
      }
      if (b.status !== 'completed' && b.status !== 'rejected') await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [id, 'cancelled']);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
  }
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0];
}
