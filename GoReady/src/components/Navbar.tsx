import React from 'react';

export type NavView = 'home' | 'explore' | 'news' | 'trips' | 'account';

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'booking', title: 'Tour sắp khởi hành', content: 'Tour "Khám phá Vịnh Hạ Long" của bạn sẽ khởi hành trong 3 ngày nữa. Đừng quên mang giấy tờ tùy thân!', time: '2 giờ trước', read: false },
  { id: '2', type: 'promo', title: 'Khuyến mãi mùa hè', content: 'Giảm ngay 20% cho tất cả các tour biển đảo trong tuần này!', time: '1 ngày trước', read: false },
  { id: '3', type: 'system', title: 'Thanh toán thành công', content: 'Giao dịch cho booking GR12345 đã được xác nhận. Xem vé trong chuyến đi của tôi.', time: '2 ngày trước', read: true },
];

interface NavbarProps {
  view: NavView;
  onNavigate: (view: NavView) => void;
  savedCount: number;
  compareCount: number;
  onOpenSaved: () => void;
  onOpenAi: () => void;
  userName: string | null;
  userRole: 'user' | 'admin' | null;
  avatarUrl?: string | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenAccountTab: (tab: 'profile' | 'reviews' | 'settings' | 'support') => void;
}

const MAIN_LINKS: { label: string; mobileLabel: string; value: NavView }[] = [
  { label: 'Trang chủ', mobileLabel: 'Trang chủ', value: 'home' },
  { label: 'Khám phá Tour', mobileLabel: 'Khám phá', value: 'explore' },
  { label: 'Chuyến đi của tôi', mobileLabel: 'Chuyến đi', value: 'trips' },
  { label: 'Bảng tin', mobileLabel: 'Bảng tin', value: 'news' },
];

const USER_MENU_ITEMS = ['Trang cá nhân', 'Chuyến đi của tôi', 'Đánh giá của tôi', 'Cài đặt & bảo mật', 'Hỗ trợ'];
const ADMIN_MENU_ITEMS = ['Trang cá nhân', 'Chuyến đi của tôi', 'Hỗ trợ'];

const Navbar: React.FC<NavbarProps> = ({
  view,
  onNavigate,
  savedCount,
  compareCount,
  onOpenSaved,
  onOpenAi,
  userName,
  userRole,
  avatarUrl,
  onOpenLogin,
  onLogout,
  onOpenAccountTab,
}) => {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS);
  
  const accountRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const isAdmin = userRole === 'admin';
  const unreadCount = notifications.filter((n) => !n.read).length;

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleAccountItem = (label: string) => {
    setAccountOpen(false);
    if (label === 'Trang cá nhân') {
      onOpenAccountTab('profile');
      return;
    }
    if (label === 'Chuyến đi của tôi') {
      onNavigate('trips');
      return;
    }
    if (label === 'Đánh giá của tôi') {
      onOpenAccountTab('reviews');
      return;
    }
    if (label === 'Cài đặt & bảo mật') {
      onOpenAccountTab('settings');
      return;
    }
    if (label === 'Hỗ trợ') {
      onOpenAccountTab('support');
      return;
    }
  };

  const menuItems = isAdmin ? ADMIN_MENU_ITEMS : USER_MENU_ITEMS;

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
              key={link.label}
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

          {userName ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotificationsOpen((v) => !v)}
                  className="relative flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  <span className="text-[17px] leading-none" aria-hidden>🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-[3px] right-[5px] h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] animate-fadeIn z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Thông báo</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">Bạn chưa có thông báo nào</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 p-4 border-b border-slate-50 transition-colors hover:bg-slate-50 cursor-pointer ${
                              !n.read ? 'bg-indigo-50/30' : ''
                            }`}
                            onClick={() =>
                              setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                            }
                          >
                            <div className="mt-0.5 text-xl shrink-0">
                              {n.type === 'booking' ? '🧳' : n.type === 'promo' ? '🎉' : '✅'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${!n.read ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>
                                {n.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.content}</p>
                              <p className="mt-1.5 text-[10px] font-medium text-slate-400">{n.time}</p>
                            </div>
                            {!n.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"></div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-sm font-semibold transition-colors ${
                  isAdmin
                    ? 'border-2 border-amber-400 text-amber-700 hover:border-amber-500'
                    : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold ${
                    isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                  }`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : isAdmin ? (
                    '👑'
                  ) : (
                    userName.trim()[0]?.toUpperCase() ?? 'U'
                  )}
                </span>
                <span className="hidden sm:inline">{userName.split(' ').slice(-1)[0]}</span>
                {isAdmin && <span className="hidden sm:inline text-[10px] font-bold text-amber-600">ADMIN</span>}
                <span aria-hidden className="text-[10px]">▾</span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-card animate-fadeIn">
                  {/* Admin header */}
                  {isAdmin && (
                    <div className="border-b border-amber-100 bg-amber-50 px-4 py-2">
                      <p className="text-xs font-bold text-amber-700">👑 Quản trị viên</p>
                      <a
                        href="/admin/"
                        className="mt-0.5 block text-xs font-semibold text-amber-600 hover:underline"
                        onClick={() => setAccountOpen(false)}
                      >
                        → Vào trang Admin
                      </a>
                    </div>
                  )}

                  {menuItems.map((item) => (
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
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
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
            key={link.label}
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
