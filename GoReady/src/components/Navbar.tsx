import React from 'react';

export type NavView = 'home' | 'news' | 'trips';

interface NavbarProps {
  view: NavView;
  onNavigate: (view: NavView) => void;
  savedCount: number;
  compareCount: number;
  onOpenSaved: () => void;
  onOpenAi: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onAccountAction: (label: string) => void;
}

const MAIN_LINKS: { label: string; mobileLabel: string; value: NavView }[] = [
  { label: 'Bảng tin', mobileLabel: 'Bảng tin', value: 'news' },
  { label: 'Khám phá Tour', mobileLabel: 'Khám phá', value: 'home' },
  { label: 'Chuyến đi của tôi', mobileLabel: 'Chuyến đi', value: 'trips' },
];

const ACCOUNT_MENU_ITEMS = ['Trang cá nhân', 'Chuyến đi của tôi', 'Đánh giá của tôi', 'Cài đặt & bảo mật', 'Hỗ trợ'];

const Navbar: React.FC<NavbarProps> = ({
  view,
  onNavigate,
  savedCount,
  compareCount,
  onOpenSaved,
  onOpenAi,
  isLoggedIn,
  onLogin,
  onLogout,
  onAccountAction,
}) => {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const accountRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleAccountItem = (label: string) => {
    setAccountOpen(false);
    if (label === 'Chuyến đi của tôi') {
      onNavigate('trips');
      return;
    }
    onAccountAction(label);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="container-px mx-auto flex h-16 items-center justify-between gap-4">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white text-lg font-heading font-bold shadow-card">G</span>
          <span className="font-heading text-xl font-bold text-slate-900">
            Go<span className="text-primary">Ready</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium">
          {MAIN_LINKS.map((link) => (
            <button
              key={link.value}
              onClick={() => onNavigate(link.value)}
              className={`rounded-full px-4 py-2 transition-colors ${view === link.value ? 'bg-primary text-white shadow-card' : 'text-slate-600 hover:text-primary'}`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSaved}
            className="relative flex items-center gap-2 rounded-full border border-slate-200 px-3 sm:px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
          >
            <span aria-hidden>♡</span>
            <span className="hidden sm:inline">Đã lưu</span>
            {(savedCount > 0 || compareCount > 0) && (
              <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {savedCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenAi}
            className="hidden sm:flex items-center gap-2 rounded-full border border-accent-dark/40 bg-accent/20 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-accent/40 transition-colors"
          >
            <span aria-hidden>✨</span> AI Lập Lịch Trình
          </button>

          {isLoggedIn ? (
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 pl-1.5 pr-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">TK</span>
                <span className="hidden sm:inline">Tài khoản</span>
                <span aria-hidden className="text-[10px]">▾</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-card animate-fadeIn">
                  {ACCOUNT_MENU_ITEMS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleAccountItem(item)}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {item}
                    </button>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="rounded-full bg-primary px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-600 transition-colors"
            >
              Đăng nhập/Đăng ký
            </button>
          )}
        </div>
      </div>
      <nav className="flex md:hidden items-center gap-1 border-t border-slate-100 bg-white px-4 py-2 text-sm font-medium">
        {MAIN_LINKS.map((link) => (
          <button
            key={link.value}
            onClick={() => onNavigate(link.value)}
            className={`flex-1 rounded-full px-3 py-1.5 text-center transition-colors ${view === link.value ? 'bg-primary text-white' : 'text-slate-600'}`}
          >
            {link.mobileLabel}
          </button>
        ))}
        <button onClick={onOpenAi} className="flex-1 rounded-full px-3 py-1.5 text-center text-primary">
          ✨ AI
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
