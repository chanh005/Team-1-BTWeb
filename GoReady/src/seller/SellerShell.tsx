import React from 'react';
import type { SellerProfile } from '../api';
import { Logo } from './ui';

export const NAV_ITEMS: { path: string; label: string; soon?: boolean }[] = [
  { path: '/tong-quan', label: 'Tổng quan' },
  { path: '/tour-cua-toi', label: 'Tour của tôi' },
  { path: '/tour-moi', label: 'Đăng tour mới', soon: true },
  { path: '/booking', label: 'Booking' },
  { path: '/lich-khoi-hanh', label: 'Lịch khởi hành', soon: true },
  { path: '/danh-gia', label: 'Đánh giá của khách', soon: true },
  { path: '/ho-so', label: 'Hồ sơ doanh nghiệp', soon: true },
];

interface Props {
  path: string;
  seller: SellerProfile;
  /** Số booking đang chờ xác nhận (hiện trên menu Booking). */
  pendingBookings?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

/** Khung Seller Center: thanh trên + menu bên trái. */
const SellerShell: React.FC<Props> = ({ path, seller, pendingBookings = 0, onLogout, children }) => {
  const [menuOpen, setMenuOpen] = React.useState(false); // menu tài khoản
  const [navOpen, setNavOpen] = React.useState(false); // menu trái trên điện thoại

  // "Đăng tour mới" sáng lên cả khi đang sửa tour (đường dẫn /tour/:id/sua)
  const activePath = path.startsWith('/tour/') ? '/tour-moi' : path;

  const Nav = () => (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((it) => (
        <a
          key={it.path}
          href={`#${it.path}`}
          onClick={() => setNavOpen(false)}
          className={`flex items-center justify-between rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
            activePath === it.path ? 'bg-[#3D72BB] text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {it.label}
          {it.path === '/booking' && pendingBookings > 0 && (
            <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-slate-900 px-1.5 text-[11px] font-bold text-white">{pendingBookings}</span>
          )}
          {it.soon && <span className={`text-[10px] font-medium ${activePath === it.path ? 'text-white/80' : 'text-slate-400'}`}>Sắp có</span>}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden" aria-label="Mở menu">☰</button>
          <Logo sub="Seller Center" />
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="rounded-full border border-slate-800 px-4 py-1.5 text-sm font-semibold text-slate-900">
            {seller.business_name} ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
              <button onClick={onLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100">Đăng xuất</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-200 bg-white px-3 py-5 lg:block">
          <Nav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white px-3 py-5">
            <Nav />
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerShell;
