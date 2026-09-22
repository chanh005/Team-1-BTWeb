import React from 'react';

export type AdminPage = 'dashboard' | 'tours' | 'bookings' | 'users' | 'articles';

interface AdminLayoutProps {
  page: AdminPage;
  onNavigate: (page: AdminPage) => void;
  adminName: string;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { label: string; value: AdminPage; icon: string }[] = [
  { label: 'Tổng quan', value: 'dashboard', icon: '📊' },
  { label: 'Quản lý Tour', value: 'tours', icon: '🧭' },
  { label: 'Đơn đặt tour', value: 'bookings', icon: '🎫' },
  { label: 'Người dùng', value: 'users', icon: '👤' },
  { label: 'Bảng tin', value: 'articles', icon: '📰' },
];

const USER_SITE_URL = '/';

const AdminLayout: React.FC<AdminLayoutProps> = ({ page, onNavigate, adminName, onLogout, children }) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.value}
          onClick={() => {
            onNavigate(item.value);
            onClick?.();
          }}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
            page === item.value ? 'bg-primary text-white shadow-card' : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface font-body">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-slate-900 px-4 py-6 lg:flex">
          <div className="flex items-center gap-2 px-1.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-lg font-heading font-bold shadow-card">G</span>
            <div>
              <p className="font-heading text-base font-bold text-white">
                Go<span className="text-primary-300">Ready</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Admin Console</p>
            </div>
          </div>
          <NavLinks />
          <div className="mt-auto flex flex-col gap-2">
            <a href={USER_SITE_URL} className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
              ← Trang người dùng
            </a>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur sm:px-6">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Mở menu"
            >
              ☰
            </button>
            <h1 className="font-heading text-lg font-bold text-slate-900">{NAV_ITEMS.find((n) => n.value === page)?.label}</h1>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-slate-600 sm:inline">Xin chào, {adminName}</span>
              <button
                onClick={onLogout}
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-500"
              >
                Đăng xuất
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-slate-900 px-4 py-6">
            <div className="flex items-center justify-between px-1.5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-lg font-heading font-bold shadow-card">G</span>
                <p className="font-heading text-base font-bold text-white">
                  Go<span className="text-primary-300">Ready</span>
                </p>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="text-slate-300" aria-label="Đóng menu">
                ✕
              </button>
            </div>
            <NavLinks onClick={() => setMobileNavOpen(false)} />
            <a href={USER_SITE_URL} className="mt-auto rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
              ← Trang người dùng
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
