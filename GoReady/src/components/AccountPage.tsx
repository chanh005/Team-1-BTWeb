import React from 'react';
import type { AccountUser, Booking, Tour, UserReview } from '../types';
import { formatVND, formatDateLong } from '../utils/format';
import { fileToResizedDataUrl } from '../utils/image';
import PolicyModal, { type PolicyTopic } from './PolicyModal';

interface AccountPageProps {
  currentUser: AccountUser;
  myBookings: Booking[];
  tours: Tour[];
  userReviews: UserReview[];
  onLogout: () => void;
  onNavigate: (view: 'trips') => void;
  onUpdateAvatar: (avatar: string) => Promise<void>;
  initialTab?: 'profile' | 'reviews' | 'settings' | 'support';
}

type TabKey = 'profile' | 'reviews' | 'settings' | 'support';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Đã xác nhận', color: '#1a56db', bg: '#eff6ff' },
  upcoming:  { label: 'Sắp khởi hành', color: '#7e3af2', bg: '#f5f3ff' },
  completed: { label: 'Đã hoàn thành', color: '#059669', bg: '#ecfdf5' },
  cancelled: { label: 'Đã hủy',        color: '#dc2626', bg: '#fef2f2' },
};

const AccountPage: React.FC<AccountPageProps> = ({ currentUser, myBookings, tours, userReviews, onLogout, onNavigate, onUpdateAvatar, initialTab = 'profile' }) => {
  const [activeTab, setActiveTab] = React.useState<TabKey>(initialTab);
  const [policyTopic, setPolicyTopic] = React.useState<PolicyTopic | null>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState('');
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn một tệp hình ảnh.');
      return;
    }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      await onUpdateAvatar(dataUrl);
    } catch {
      setAvatarError('Không thể cập nhật ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const getTourName = (tourId: string) => tours.find((t) => t.id === tourId)?.name ?? tourId;

  const initials = currentUser.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 pt-12 pb-32"
        style={{ background: 'linear-gradient(135deg, #1a56db 0%, #7e3af2 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

        <div className="container-px relative mx-auto flex flex-col items-center gap-4 text-center">
          {/* Avatar */}
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-white/20 text-3xl font-bold text-white shadow-xl backdrop-blur-sm">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              {avatarUploading && (
                <div className="absolute inset-0 grid place-items-center rounded-3xl bg-slate-900/50">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              title="Đổi ảnh đại diện"
              className="absolute -top-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-sm text-primary shadow ring-2 ring-white/60 transition hover:bg-primary hover:text-white disabled:cursor-not-allowed"
            >
              📷
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {isAdmin && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-bold text-amber-900 shadow">
                👑 ADMIN
              </span>
            )}
          </div>

          {avatarError && (
            <p className="-mt-1 rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-white">{avatarError}</p>
          )}

          <div className="mt-2">
            <h1 className="text-2xl font-bold text-white">{currentUser.name}</h1>
            <p className="mt-0.5 text-sm text-white/70">{currentUser.email}</p>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex gap-6">
            {[
              { label: 'Đã đặt', value: myBookings.length },
              { label: 'Đánh giá', value: userReviews.length },
              { label: 'Thành viên từ', value: currentUser.joinedAt?.slice(0, 4) ?? '—' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────── */}
      <div className="container-px relative mx-auto -mt-16 max-w-5xl flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="rounded-2xl bg-white p-2 shadow-sm flex flex-row md:flex-col overflow-x-auto custom-scrollbar">
            {[
              { key: 'profile', label: 'Thông tin chung', icon: '👤' },
              { key: 'reviews', label: 'Đánh giá của tôi', icon: '⭐' },
              { key: 'settings', label: 'Cài đặt & Bảo mật', icon: '⚙️' },
              { key: 'support', label: 'Hỗ trợ', icon: '🎧' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all shrink-0 md:shrink ${
                  activeTab === tab.key
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            
            <div className="hidden md:block my-2 border-t border-slate-100"></div>
            
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
            >
              <span className="text-lg">🚪</span>
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fadeIn">
              {isAdmin && (
                <a
                  href="/admin/"
                  className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm transition hover:bg-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl shadow">🛡️</span>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Trang quản trị Admin</p>
                      <p className="text-xs text-amber-600">Quản lý tour, booking và người dùng</p>
                    </div>
                  </div>
                  <span className="text-amber-500">→</span>
                </a>
              )}

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Thông tin cá nhân</h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Họ và tên', value: currentUser.name },
                    { label: 'Email', value: currentUser.email },
                    { label: 'Số điện thoại', value: currentUser.phone || 'Chưa cập nhật' },
                    { label: 'Ngày tham gia', value: currentUser.joinedAt },
                    { label: 'Vai trò', value: isAdmin ? '👑 Quản trị viên' : '👤 Người dùng' },
                    { label: 'Trạng thái', value: currentUser.status === 'active' ? '🟢 Hoạt động' : '🔴 Bị khóa' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">Lịch sử đặt tour gần đây</h2>
                  {myBookings.length > 0 && (
                    <button onClick={() => onNavigate('trips')} className="text-sm font-semibold text-indigo-600 hover:underline">
                      Xem tất cả
                    </button>
                  )}
                </div>

                {myBookings.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <span className="text-4xl">✈️</span>
                    <p className="text-sm font-medium">Bạn chưa có chuyến đi nào</p>
                    <p className="text-xs">Khám phá các tour hấp dẫn ngay!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myBookings.slice(0, 5).map((b) => {
                      const s = STATUS_LABELS[b.status] ?? STATUS_LABELS.confirmed;
                      return (
                        <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{getTourName(b.tourId)}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {b.departureDate} · {b.adults + b.children} người · <span className="font-semibold text-primary">{formatVND(b.totalPrice)}</span>
                            </p>
                          </div>
                          <span className="ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-bold" style={{ color: s.color, backgroundColor: s.bg }}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Đánh giá của tôi</h2>
                
                {userReviews.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <span className="text-4xl">⭐</span>
                    <p className="text-sm font-medium">Bạn chưa viết đánh giá nào</p>
                    <p className="text-xs">Hãy trải nghiệm tour và chia sẻ cảm nhận nhé!</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-6">Bạn đã gửi {userReviews.length} đánh giá.</p>
                    <div className="flex flex-col gap-4">
                      {userReviews.map(review => (
                        <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:shadow-sm transition">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{getTourName(review.tourId)}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-slate-300'}`}>★</span>
                                ))}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-slate-400">{formatDateLong(review.date)}</span>
                          </div>
                          <p className="mt-3 text-sm text-slate-600 leading-relaxed">"{review.content}"</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-slate-800">Cập nhật mật khẩu</h2>
                <p className="text-sm text-slate-500 mb-6">Đảm bảo tài khoản của bạn đang sử dụng mật khẩu dài, ngẫu nhiên để an toàn.</p>
                
                <form className="max-w-md space-y-4" onSubmit={e => e.preventDefault()}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mật khẩu hiện tại</span>
                    <input type="password" placeholder="••••••••" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mật khẩu mới</span>
                    <input type="password" placeholder="••••••••" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Xác nhận mật khẩu mới</span>
                    <input type="password" placeholder="••••••••" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                  </label>
                  <button type="button" onClick={() => alert('Đây là giao diện demo. Tính năng chưa được kết nối backend.')} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
                    Lưu mật khẩu mới
                  </button>
                </form>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-slate-800">Thông tin liên hệ</h2>
                <p className="text-sm text-slate-500 mb-6">Số điện thoại sẽ được dùng để liên hệ khi có thay đổi lịch trình.</p>
                
                <form className="max-w-md space-y-4" onSubmit={e => e.preventDefault()}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Số điện thoại</span>
                    <input type="tel" defaultValue={currentUser.phone} placeholder="0901234567" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
                  </label>
                  <button type="button" onClick={() => alert('Đây là giao diện demo.')} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
                    Cập nhật
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: SUPPORT */}
          {activeTab === 'support' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800">Trung tâm trợ giúp</h2>
                
                <div className="grid gap-4 md:grid-cols-2 mb-8">
                  <button
                    type="button"
                    onClick={() => setPolicyTopic('booking-guide')}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center transition hover:border-primary hover:shadow-sm cursor-pointer"
                  >
                    <div className="text-3xl mb-2">📖</div>
                    <p className="font-bold text-slate-800">Hướng dẫn đặt tour</p>
                    <p className="mt-1 text-xs text-slate-500">Các bước chi tiết để đặt và thanh toán</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyTopic('payment-refund')}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center transition hover:border-primary hover:shadow-sm cursor-pointer"
                  >
                    <div className="text-3xl mb-2">💳</div>
                    <p className="font-bold text-slate-800">Thanh toán & Hoàn tiền</p>
                    <p className="mt-1 text-xs text-slate-500">Thông tin về cổng thanh toán và hoàn hủy</p>
                  </button>
                </div>

                <h3 className="mb-4 font-bold text-slate-800">Liên hệ hỗ trợ</h3>
                <div className="grid gap-4 md:grid-cols-2 mb-8">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <div className="text-3xl mb-2">📞</div>
                    <p className="font-bold text-slate-800">Hotline 24/7</p>
                    <p className="mt-1 text-sm text-primary font-semibold">0774 353 428</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <div className="text-3xl mb-2">✉️</div>
                    <p className="font-bold text-slate-800">Email hỗ trợ</p>
                    <p className="mt-1 text-sm text-primary font-semibold">chanhanh485@gmail.com</p>
                  </div>
                </div>

                <h3 className="mb-4 font-bold text-slate-800">Câu hỏi thường gặp</h3>
                <div className="space-y-3 mb-8">
                  {[
                    { q: 'Làm sao để hủy tour đã đặt?', a: 'Bạn có thể hủy tour trước 7 ngày khởi hành để được hoàn tiền 100%. Vui lòng liên hệ hotline để được hỗ trợ thủ tục.' },
                    { q: 'Tôi có thể đổi ngày đi không?', a: 'Có thể đổi ngày đi tùy thuộc vào tình trạng chỗ trống của tour mới. Phụ phí có thể phát sinh nếu tour mới có giá cao hơn.' },
                    { q: 'Thanh toán trực tuyến có an toàn không?', a: 'GoReady sử dụng cổng thanh toán VNPAY an toàn với chuẩn mã hóa cao nhất. Thông tin thẻ của bạn không được lưu trên hệ thống của chúng tôi.' },
                  ].map((faq, i) => (
                    <details key={i} className="group rounded-xl border border-slate-200 bg-white [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-slate-800">
                        {faq.q}
                        <span className="transition group-open:rotate-180">▾</span>
                      </summary>
                      <div className="border-t border-slate-100 p-4 text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-b-xl">
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>

                <h3 className="mb-4 font-bold text-slate-800">Chính sách & Quy định</h3>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setPolicyTopic('terms')}
                    className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>📄 Điều khoản sử dụng</span>
                    <span className="text-slate-400">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyTopic('privacy')}
                    className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>🔒 Chính sách bảo mật</span>
                    <span className="text-slate-400">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyTopic('cancellation')}
                    className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>🔄 Chính sách hoàn hủy</span>
                    <span className="text-slate-400">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logout button mobile only */}
          <button
            onClick={onLogout}
            className="mt-6 w-full flex md:hidden items-center justify-center gap-2 rounded-xl bg-white border border-red-100 py-3 text-sm font-semibold text-red-500 shadow-sm hover:bg-red-50"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {policyTopic && <PolicyModal topic={policyTopic} onClose={() => setPolicyTopic(null)} />}
    </div>
  );
};

export default AccountPage;
