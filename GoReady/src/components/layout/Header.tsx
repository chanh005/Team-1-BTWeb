import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

// ==========================================================================
// Header — component điều hướng dùng chung cho toàn bộ site GoReady
// ==========================================================================

export interface HeaderProps {
  /** Biến giả xác định trạng thái đăng nhập; thay bằng state auth thật khi tích hợp. */
  isLoggedIn?: boolean;
  userName?: string;
  avatarUrl?: string;
  /** Số thông báo chưa đọc; 0 hoặc không truyền sẽ ẩn badge. */
  unreadNotifications?: number;
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

const Header: React.FC<HeaderProps> = ({
  isLoggedIn = false,
  userName = 'Khách GoReady',
  avatarUrl,
  unreadNotifications = 0,
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  // Đóng menu mobile mỗi khi chuyển route.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Khóa scroll nền khi menu mobile đang mở.
  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors ${
      isActive ? 'bg-primary text-white shadow-card' : 'text-slate-600 hover:bg-primary-50 hover:text-primary'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-primary-50 hover:text-primary'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="container-px mx-auto flex h-16 items-center justify-between gap-4">
        {/* Logo + brand */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-heading font-bold text-white shadow-card">
            G
          </span>
          <span className="font-heading text-xl font-bold text-slate-900">
            Go<span className="text-primary">Ready</span>
          </span>
        </Link>

        {/*
          Menu điều hướng desktop. 9 mục đủ tên (đặc biệt mục 7 khá dài) thường rộng hơn
          không gian giữa logo và khu tài khoản ở nhiều kích thước desktop phổ biến (~1440px).
          Thay vì cắt ẩn mục cuối một cách vô hình, để overflow-x-auto tự lộ scrollbar mỏng
          làm tín hiệu "còn mục phía sau" — không đổi tên/ẩn bớt mục nào.
        */}
        <nav className="hidden min-w-0 items-center gap-0.5 overflow-x-auto lg:flex" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={desktopLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Khu vực tài khoản desktop */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                aria-label="Thông báo"
                className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-primary hover:text-primary"
              >
                <BellIcon />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {initials(userName)}
                  </span>
                )}
                <span className="max-w-[9rem] truncate text-sm font-semibold text-slate-800">{userName}</span>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/tai-khoan"
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-primary"
              >
                Đăng nhập
              </Link>
              <Link
                to="/tai-khoan"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-600"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>

        {/* Nút hamburger — mobile/tablet */}
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="animate-fadeIn border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Điều hướng chính (mobile)">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={mobileLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {isLoggedIn ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {initials(userName)}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-800">{userName}</span>
                </div>
                <button
                  type="button"
                  aria-label="Thông báo"
                  className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600"
                >
                  <BellIcon />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/tai-khoan"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/tai-khoan"
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-white shadow-card"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BellIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default Header;
