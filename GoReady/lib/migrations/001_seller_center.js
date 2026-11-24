// Migration 001 — Seller Center (đăng ký người bán).
// Chỉ THÊM bảng mới (sellers, seller_files). Không sửa/xóa bảng hay cột nào đang có.
// Chạy tự động từ ensureSchema (idempotent: chạy lại nhiều lần vẫn an toàn).
// Chưa có cột tài khoản ngân hàng: chờ chốt mô hình thanh toán.

export const SELLER_BUSINESS_TYPES = ['domestic_travel', 'international_travel', 'tour_organizer'];

const SQL = `
  CREATE TABLE IF NOT EXISTS sellers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    business_name TEXT NOT NULL,
    tax_code TEXT NOT NULL UNIQUE,
    business_type TEXT NOT NULL CHECK (business_type IN ('domestic_travel', 'international_travel', 'tour_organizer')),
    legal_representative TEXT NOT NULL,
    address TEXT NOT NULL,
    hotline TEXT NOT NULL,
    website TEXT,
    logo_url TEXT,
    travel_license_number TEXT,
    travel_license_issued_at DATE,
    business_reg_file TEXT,
    travel_license_file TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers (status, created_at);

  -- File người bán tải lên (logo, giấy phép). Lưu trong database vì Vercel không có ổ đĩa lưu lâu dài.
  CREATE TABLE IF NOT EXISTS seller_files (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('logo', 'business_reg', 'travel_license')),
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export async function runSellerMigration(pool) {
  await pool.query(SQL);
}
