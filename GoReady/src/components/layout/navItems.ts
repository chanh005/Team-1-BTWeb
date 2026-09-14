export interface NavItem {
  label: string;
  path: string;
}

// Nguồn dữ liệu DUY NHẤT cho 9 mục điều hướng của site.
// Header và Footer cùng import từ đây để sitemap luôn khớp chính xác với menu chính —
// không định nghĩa lại danh sách này ở nơi khác.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Đăng nhập/Tài khoản', path: '/tai-khoan' },
  { label: 'Gợi ý', path: '/goi-y' },
  { label: 'Khám phá', path: '/kham-pha' },
  { label: 'Thư viện', path: '/thu-vien' },
  { label: 'Đặt dịch vụ', path: '/dat-dich-vu' },
  { label: 'Quản lý chuyến đi - Lịch trình của tôi', path: '/lich-trinh' },
  { label: 'Trợ lý du lịch', path: '/tro-ly' },
  { label: 'Bảng tin cá nhân', path: '/bang-tin' },
];
