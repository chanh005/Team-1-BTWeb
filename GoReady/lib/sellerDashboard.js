import { BASE_SQL, TODAY_SQL, shape, withDates } from './sellerBookings.js';

// Tổng quan của người bán: chỉ ĐỌC và tổng hợp từ tours / bookings / tour_departures (không có bảng riêng).
// Mọi truy vấn đều lọc theo seller_id ($1). Không có dữ liệu thì trả 0 và danh sách rỗng.

/** Còn từ 20% số chỗ trở xuống thì coi là "sắp hết chỗ" (còn * 5 <= tối đa). */
const LOW_SEATS_NUMERATOR = 5;

export async function getSellerDashboard(pool, sellerId) {
  // 1) Bốn con số trong MỘT câu truy vấn
  const countsQ = pool.query(
    `WITH bk AS (${withDates(BASE_SQL)})
     SELECT
       (SELECT COUNT(*) FROM bk WHERE status = 'pending')::int AS pending_bookings,
       (SELECT COUNT(*) FROM bk WHERE status = 'confirmed' AND start_date BETWEEN ${TODAY_SQL} AND ${TODAY_SQL} + 7)::int AS departing_soon_bookings,
       (SELECT COUNT(*) FROM tours WHERE seller_id = $1 AND status = 'active')::int AS active_tours,
       (SELECT COUNT(*) FROM tours WHERE seller_id = $1 AND status = 'pending_review')::int AS pending_review_tours`,
    [sellerId],
  );

  // 2) 5 booking chờ xác nhận mới nhất
  const pendingQ = pool.query(
    `SELECT * FROM (${withDates(BASE_SQL)}) y WHERE y.status = 'pending' ORDER BY y."createdAt" DESC LIMIT 5`,
    [sellerId],
  );

  // 3) Tour cần chú ý: sắp hết chỗ / bị từ chối / chưa có ngày khởi hành trong tương lai
  const attentionQ = pool.query(
    `SELECT * FROM (
       SELECT 'low_seats' AS type, 1 AS ord, t.id AS tour_id, t.name AS tour_name, t.status,
              (d.max_seats - d.booked_seats) AS remaining_seats, NULL::text AS reject_reason,
              to_char(d.departure_date, 'YYYY-MM-DD') AS departure_date
       FROM tours t
       JOIN LATERAL (
         SELECT max_seats, booked_seats, departure_date FROM tour_departures
         WHERE tour_id = t.id AND departure_date >= ${TODAY_SQL}
         ORDER BY departure_date, id LIMIT 1
       ) d ON TRUE
       WHERE t.seller_id = $1 AND t.status = 'active' AND d.max_seats > 0
         AND (d.max_seats - d.booked_seats) * ${LOW_SEATS_NUMERATOR} <= d.max_seats
       UNION ALL
       SELECT 'rejected', 2, t.id, t.name, t.status, NULL, t.reject_reason, NULL
       FROM tours t WHERE t.seller_id = $1 AND t.status = 'rejected'
       UNION ALL
       SELECT 'no_departure', 3, t.id, t.name, t.status, NULL, NULL, NULL
       FROM tours t
       WHERE t.seller_id = $1 AND t.status IN ('active', 'draft')
         AND NOT EXISTS (SELECT 1 FROM tour_departures d WHERE d.tour_id = t.id AND d.departure_date >= ${TODAY_SQL})
     ) a ORDER BY a.ord, a.tour_name LIMIT 20`,
    [sellerId],
  );

  const [counts, pending, attention] = await Promise.all([countsQ, pendingQ, attentionQ]);
  const c = counts.rows[0];
  return {
    counts: {
      pending_bookings: c.pending_bookings,
      active_tours: c.active_tours,
      pending_review_tours: c.pending_review_tours,
      departing_soon_bookings: c.departing_soon_bookings,
    },
    pending_bookings: pending.rows.map((r) => {
      const b = shape(r);
      return { id: b.id, bookingCode: b.bookingCode, tour_name: b.tour_name, start_date: b.start_date, adults: b.adults, children: b.children, infants: b.infants, status: b.status };
    }),
    attention: attention.rows.map((r) => ({
      type: r.type, tour_id: r.tour_id, tour_name: r.tour_name, status: r.status,
      ...(r.type === 'low_seats' && { remaining_seats: r.remaining_seats, departure_date: r.departure_date }),
      ...(r.type === 'rejected' && { reject_reason: r.reject_reason }),
    })),
  };
}
