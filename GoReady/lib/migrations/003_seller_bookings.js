// Migration 003 — Quản lý booking của người bán.
// Chỉ THÊM cột vào bảng `bookings` hiện có. Các cột cũ giữ nguyên và được dùng lại:
//   số người lớn = adults, số trẻ em = children, tổng tiền = "totalPrice", ghi chú của khách = note, status (TEXT).
// Seller của booking được xác định qua tours.seller_id (không lưu trùng).
// Giá trị status mới: pending, rejected (cũ: upcoming, confirmed, completed, cancelled). Không thêm CHECK để không
// làm hỏng dữ liệu cũ. Booking cũ status 'upcoming' hoặc rỗng được coi là pending ở phía người bán.

const SQL = `
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS departure_id INTEGER REFERENCES tour_departures(id) ON DELETE SET NULL;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seller_note TEXT;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
  CREATE INDEX IF NOT EXISTS idx_bookings_tour ON bookings ("tourId");
  CREATE INDEX IF NOT EXISTS idx_bookings_departure ON bookings (departure_id);
`;

export async function runSellerBookingsMigration(pool) {
  await pool.query(SQL);
}
