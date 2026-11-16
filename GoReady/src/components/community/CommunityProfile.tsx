import React, { useState } from 'react';

// Mục "Hồ sơ du lịch" — dựng theo wireframe, dữ liệu mẫu (sẽ nối API sau).
// "Lượt hữu ích nhận được" = số lượt Hữu ích trên các bài ĐÃ DUYỆT (đếm từ bảng lượt bấm, không lưu bộ đếm riêng).
type Tab = 'map' | 'posts' | 'saved' | 'points';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Bản đồ hành trình' },
  { id: 'posts', label: 'Bài đã đăng (19)' },
  { id: 'saved', label: 'Đã lưu (5)' },
  { id: 'points', label: 'Lịch sử GoPoint' },
];

const PROVINCES = ['Lào Cai', 'Hà Giang', 'Sơn La', 'Đà Nẵng', 'Quảng Nam', 'Hà Nội', 'Phú Quốc', 'Khánh Hòa', 'Huế', 'Lâm Đồng', 'Cần Thơ'];
const VISITED = new Set(['Lào Cai', 'Hà Giang', 'Sơn La', 'Đà Nẵng', 'Quảng Nam', 'Hà Nội']);

const BADGES = [
  { name: 'Lữ khách mới', done: true },
  { name: 'Người kể chuyện', done: true },
  { name: 'Thổ địa', done: true },
  { name: 'Đại sứ GoReady', done: false },
];

const POSTS = [
  { id: 1, title: 'Săn mây Tà Xùa 2N1Đ', meta: '04/08/2026 · ♡ 510 · Bàn 88', verified: true, status: 'Đã duyệt' },
  { id: 2, title: '[Tiêu đề bài đang chờ duyệt]', meta: '[Ngày gửi]', verified: false, status: 'Chờ duyệt' },
];

const POINTS = [{ id: 1, text: 'Bài "Săn mây Tà Xùa 2N1Đ" được duyệt', delta: '+500' }];

const statusCls = (s: string) =>
  s === 'Đã duyệt' ? 'bg-green-100 text-green-800' : s === 'Chờ duyệt' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700';

const RecentPosts: React.FC = () => (
  <div className="space-y-3">
    {POSTS.map((p) => (
      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
        <div className="h-14 w-14 flex-none rounded-lg bg-sky-100" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
          <p className="text-xs text-slate-500">
            {p.meta}{' '}
            {p.verified && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">Verified Tour</span>}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls(p.status)}`}>{p.status}</span>
        <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Sửa</button>
      </div>
    ))}
  </div>
);

export const CommunityProfile: React.FC = () => {
  const [tab, setTab] = useState<Tab>('map');
  const [isPublic, setIsPublic] = useState(true);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-2xl font-extrabold text-slate-900">Hồ sơ du lịch</h2>
        <p className="mt-1 text-[15px] text-slate-500">Hành trình, huy hiệu và bài viết của bạn</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">NHN</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-lg font-extrabold text-slate-900">Nguyễn Hoàng Nam</p>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-primary">Thổ địa Tây Bắc</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Đại sứ GoReady</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">[Bio ngắn do người dùng tự viết, tối đa 160 ký tự]</p>
          <p className="mt-1 text-xs text-slate-500">
            Tham gia từ [tháng/năm] · Đã xác thực [N] chuyến đi · Hồ sơ: {isPublic ? 'Công khai' : 'Riêng tư'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Chỉnh sửa hồ sơ</button>
          <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90">Đổi voucher GoPoint</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Bài đã đăng', '19'],
          ['Lượt hữu ích nhận được', '[N]'],
          ['Số dư GoPoint', '[N]'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="mt-1 font-heading text-2xl font-extrabold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${tab === t.id ? 'bg-primary font-bold text-white' : 'border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          {tab === 'map' && (
            <>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-heading text-[15px] font-bold text-slate-900">Bản đồ hành trình</p>
                  <p className="text-xs text-slate-500">Đã đi {VISITED.size}/34 tỉnh thành</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PROVINCES.map((p) => (
                    <span key={p} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${VISITED.has(p) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>{p}</span>
                  ))}
                  <span className="px-2 py-1.5 text-xs text-slate-400">… đủ 34</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Đăng thêm 1 bài ở miền Tây để mở khóa huy hiệu tiếp theo.</p>
              </div>
              <p className="font-heading text-[15px] font-bold text-slate-900">Bài gần đây</p>
              <RecentPosts />
            </>
          )}
          {tab === 'posts' && <RecentPosts />}
          {tab === 'saved' && (
            <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Bài đã lưu sẽ hiện ở đây.</p>
          )}
          {tab === 'points' && (
            <div className="space-y-2">
              {POINTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                  <span>{p.text}</span>
                  <b className="text-green-700">{p.delta} GoPoint</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Huy hiệu</p>
            <ul className="mt-3 space-y-2">
              {BADGES.map((b) => (
                <li key={b.name} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{b.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.done ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                    {b.done ? 'Đã đạt' : '[Còn N bài]'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Tóm tắt uy tín</p>
            <p className="mt-2 text-sm text-slate-600">Đã giúp [N] thành viên tìm được tour phù hợp qua review của mình.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Quyền riêng tư</p>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
              <span>Công khai hồ sơ</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative h-6 w-11 rounded-full transition ${isPublic ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isPublic ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};

export default CommunityProfile;
