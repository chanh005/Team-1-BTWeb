import { SellerError } from './seller.js';
import { TODAY_SQL } from './sellerBookings.js';

// Dữ liệu chỉ-đọc cho các trang "Lịch khởi hành" và "Đánh giá của khách". Mọi truy vấn lọc theo seller_id ($1).

/** Các ngày khởi hành của mọi tour của seller. scope: 'upcoming' (mặc định) hoặc 'past'. */
export async function listSellerDepartures(pool, sellerId, scope = 'upcoming') {
  if (scope !== 'upcoming' && scope !== 'past') throw new SellerError('Phạm vi không hợp lệ');
  const upcoming = scope === 'upcoming';
  const { rows } = await pool.query(
    `SELECT d.id, t.id AS tour_id, t.name AS tour_name, t.status AS tour_status, t.duration, t.price AS tour_price,
            to_char(d.departure_date, 'YYYY-MM-DD') AS departure_date,
            to_char(d.departure_date + GREATEST(COALESCE(t.duration, 1) - 1, 0), 'YYYY-MM-DD') AS end_date,
            d.price, d.max_seats, d.booked_seats, to_char(d.booking_deadline, 'YYYY-MM-DD') AS booking_deadline,
            COALESCE((SELECT SUM(COALESCE(b.adults, 0) + COALESCE(b.children, 0)) FROM bookings b
                      WHERE b.departure_id = d.id AND (b.status IS NULL OR b.status IN ('pending', 'upcoming'))), 0)::int AS pending_seats
     FROM tour_departures d JOIN tours t ON t.id = d.tour_id
     WHERE t.seller_id = $1 AND d.departure_date ${upcoming ? '>=' : '<'} ${TODAY_SQL}
     ORDER BY d.departure_date ${upcoming ? 'ASC' : 'DESC'}, t.name
     LIMIT 200`,
    [sellerId],
  );
  return { departures: rows };
}

/** Đánh giá đã đăng (community_posts, loại 'review') của các tour của seller. */
export async function listSellerReviews(pool, sellerId) {
  const base = `FROM community_posts p JOIN tours t ON t.id = p.tour_id
                WHERE t.seller_id = $1 AND p.kind = 'review' AND p.status = 'published'`;
  const [list, summary] = await Promise.all([
    pool.query(
      `SELECT p.id, p.title, p.excerpt, p.rating, p.author_name, p.published_at, t.id AS tour_id, t.name AS tour_name
       ${base} ORDER BY p.published_at DESC NULLS LAST LIMIT 100`,
      [sellerId],
    ),
    pool.query(`SELECT COUNT(*)::int AS count, ROUND(AVG(p.rating)::numeric, 1)::float AS average ${base}`, [sellerId]),
  ]);
  return { summary: { count: summary.rows[0].count, average: summary.rows[0].average }, reviews: list.rows };
}
