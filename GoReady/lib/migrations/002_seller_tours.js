// Migration 002 — Seller Center: tour của người bán.
// Mở rộng bảng `tours` hiện có (KHÔNG tạo bảng tour thứ hai) và thêm 3 bảng phụ.
// Chỉ THÊM cột/bảng; mọi cột cũ giữ nguyên. Idempotent.
//
// Cột cũ được dùng lại (tên khác với đề bài, theo tên đang có):
//   phương tiện = transport, số sao = "hotelStars", số ngày = duration, số đêm = nights, điểm khởi hành = departure,
//   quy mô đoàn = "groupSizeTags", giá bao gồm = includes, giá chưa bao gồm = excludes,
//   chính sách hủy = "cancellationPolicy", ảnh bìa = "coverImage".
// Cột mới: seller_id, status, reject_reason, child_policy (chính sách trẻ em), notes (lưu ý).

const SQL = `
  -- Tour đang có sẵn tự nhận status = 'active' (DEFAULT) nên trang người mua không mất tour nào.
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS seller_id TEXT REFERENCES sellers(id);
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS reject_reason TEXT;
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS child_policy TEXT;
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE tours ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  CREATE INDEX IF NOT EXISTS idx_tours_seller ON tours (seller_id, status);
  CREATE INDEX IF NOT EXISTS idx_tours_status ON tours (status);

  CREATE TABLE IF NOT EXISTS tour_itinerary_days (
    id SERIAL PRIMARY KEY,
    tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    has_breakfast BOOLEAN NOT NULL DEFAULT FALSE,
    has_lunch BOOLEAN NOT NULL DEFAULT FALSE,
    has_dinner BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (tour_id, day_number)
  );

  CREATE TABLE IF NOT EXISTS tour_images (
    id SERIAL PRIMARY KEY,
    tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_tour_images_tour ON tour_images (tour_id, sort_order);

  CREATE TABLE IF NOT EXISTS tour_departures (
    id SERIAL PRIMARY KEY,
    tour_id TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    price INTEGER,                      -- giá riêng nếu khác giá chung (NULL = dùng giá chung)
    max_seats INTEGER NOT NULL DEFAULT 0,
    booked_seats INTEGER NOT NULL DEFAULT 0,
    booking_deadline DATE
  );
  CREATE INDEX IF NOT EXISTS idx_tour_departures_tour ON tour_departures (tour_id, departure_date);

  -- seller_files (của migration 001) nhận thêm loại 'tour_image' cho ảnh tour (công khai).
  ALTER TABLE seller_files DROP CONSTRAINT IF EXISTS seller_files_kind_check;
  ALTER TABLE seller_files ADD CONSTRAINT seller_files_kind_check CHECK (kind IN ('logo', 'business_reg', 'travel_license', 'tour_image'));
`;

export async function runSellerToursMigration(pool) {
  await pool.query(SQL);
  // Ràng buộc status tách riêng để chạy lại nhiều lần vẫn an toàn
  await pool.query(`ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_status_check`);
  await pool.query(
    `ALTER TABLE tours ADD CONSTRAINT tours_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'rejected', 'hidden'))`,
  );
}
