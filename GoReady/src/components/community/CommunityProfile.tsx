import React, { useState } from 'react';
import { communityApi, type PostStatus, type TravelSummary } from '../../services/communityApi';
import { useTravelSummary } from '../../hooks/useTravelSummary';
import { communitySectionHref } from '../../config/communityRoute';
import type { AccountUser } from '../../types';

// Mục "Hồ sơ du lịch". Mọi số liệu lấy từ useTravelSummary (server đếm từ bài đã duyệt), không tính riêng ở đây.
// "Lượt hữu ích" = số lượt Hữu ích trên các bài ĐÃ DUYỆT của bạn.
type Tab = 'map' | 'posts' | 'saved' | 'points';

const BIO_MAX = 160;

const STATUS_LABEL: Record<PostStatus, { text: string; cls: string }> = {
  published: { text: 'Đã duyệt', cls: 'bg-green-100 text-green-800' },
  pending: { text: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
  rejected: { text: 'Bị từ chối', cls: 'bg-rose-100 text-rose-700' },
  hidden: { text: 'Đã ẩn', cls: 'bg-slate-100 text-slate-600' },
  draft: { text: 'Nháp', cls: 'bg-slate-100 text-slate-600' },
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');
const fmtMonthYear = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};
const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '?';

const Skeleton: React.FC = () => (
  <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-label="Đang tải hồ sơ">
    <div className="h-28 rounded-2xl bg-slate-100" />
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100" />)}
    </div>
    <div className="h-64 rounded-2xl bg-slate-100" />
  </div>
);

const RecentPosts: React.FC<{ posts: TravelSummary['recentPosts'] }> = ({ posts }) =>
  posts.length === 0 ? (
    <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
      Bạn chưa có bài viết nào. <a href={communitySectionHref('soan-bai')} className="font-semibold text-primary hover:underline">Viết bài đầu tiên</a>
    </p>
  ) : (
    <div className="space-y-3">
      {posts.map((p) => {
        const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pending;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="h-14 w-14 flex-none rounded-lg bg-sky-100" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
              <p className="text-xs text-slate-500">
                {fmtDate(p.publishedAt || p.createdAt)}
                {p.isVerified && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">Verified Tour</span>}
              </p>
              {p.status === 'rejected' && p.rejectReason && <p className="mt-1 text-xs text-rose-600">Lý do: {p.rejectReason}</p>}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.text}</span>
          </div>
        );
      })}
    </div>
  );

export const CommunityProfile: React.FC<{ currentUser: AccountUser | null }> = ({ currentUser }) => {
  const auth = currentUser ? { id: currentUser.id, email: currentUser.email } : null;
  const { data, loading, error, refetch } = useTravelSummary(auth);
  const [tab, setTab] = useState<Tab>('map');
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'map', label: 'Bản đồ hành trình' },
    { id: 'posts', label: `Bài đã đăng${data ? ` (${data.postsCount})` : ''}` },
    { id: 'saved', label: 'Đã lưu' },
    { id: 'points', label: 'Lịch sử GoPoint' },
  ];

  const save = async (patch: { bio?: string; isPublic?: boolean }) => {
    if (!auth) return false;
    setSaving(true);
    setSaveError('');
    try {
      await communityApi.updateMyProfile(auth, patch);
      await refetch();
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Không lưu được. Vui lòng thử lại.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div>
      <h2 className="font-heading text-2xl font-extrabold text-slate-900">Hồ sơ du lịch</h2>
      <p className="mt-1 text-[15px] text-slate-500">Hành trình, huy hiệu và bài viết của bạn</p>
    </div>
  );

  if (!currentUser) {
    return (
      <section className="flex flex-col gap-5">
        {header}
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Vui lòng đăng nhập để xem hồ sơ du lịch của bạn.
        </p>
      </section>
    );
  }
  if (loading) return <section className="flex flex-col gap-5">{header}<Skeleton /></section>;
  if (error && !data) {
    return (
      <section className="flex flex-col gap-5">
        {header}
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          <p>Không tải được hồ sơ: {error}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">Thử lại</button>
        </div>
      </section>
    );
  }
  if (!data) return <section className="flex flex-col gap-5">{header}<Skeleton /></section>;

  const visited = new Set(data.visitedProvinces);
  const earned = data.badges.filter((b) => b.earned);
  const joined = fmtMonthYear(data.joinedAt);

  return (
    <section className="flex flex-col gap-5">
      {header}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
        {data.avatar ? (
          <img src={data.avatar} alt={data.displayName} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">{initialsOf(data.displayName)}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-lg font-extrabold text-slate-900">{data.displayName}</p>
            {earned.map((b) => (
              <span key={b.id} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-primary">{b.name}</span>
            ))}
          </div>
          {editing ? (
            <div className="mt-2">
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
                rows={2}
                aria-label="Giới thiệu ngắn"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                placeholder="Giới thiệu ngắn về bạn"
              />
              <p className="text-xs text-slate-400">{bioDraft.length}/{BIO_MAX}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{data.bio || 'Chưa có giới thiệu. Bấm "Chỉnh sửa hồ sơ" để thêm.'}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {joined && `Tham gia từ ${joined} · `}Đã xác thực {data.verifiedTripsCount} chuyến đi · Hồ sơ: {data.isPublic ? 'Công khai' : 'Riêng tư'}
          </p>
          {saveError && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{saveError}</p>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button type="button" onClick={() => { setEditing(false); setSaveError(''); }} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => { if (await save({ bio: bioDraft })) setEditing(false); }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setBioDraft(data.bio); setEditing(true); }} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Chỉnh sửa hồ sơ</button>
              <button type="button" disabled title="Sắp ra mắt" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white opacity-50">Đổi voucher GoPoint</button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Bài đã đăng', data.postsCount],
          ['Lượt hữu ích nhận được', data.helpfulCount],
          ['Số dư GoPoint', data.gopointBalance.toLocaleString('vi-VN')],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="mt-1 font-heading text-2xl font-extrabold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Hồ sơ du lịch" className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`hs-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`hs-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${tab === t.id ? 'bg-primary font-bold text-white' : 'border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chỉ tab đang mở được dựng; dữ liệu các tab đều nằm sẵn trong một lần gọi my-summary */}
        <div role="tabpanel" id={`hs-panel-${tab}`} aria-labelledby={`hs-tab-${tab}`} className="min-w-0 space-y-4">
          {tab === 'map' && (
            <>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-heading text-[15px] font-bold text-slate-900">Bản đồ hành trình</p>
                  <p className="text-xs text-slate-500">Đã đi {data.visitedProvinces.length}/{data.allProvinces.length} tỉnh thành</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(data.visitedProvinces.length / Math.max(1, data.allProvinces.length)) * 100}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.allProvinces.map((p) => (
                    <span key={p} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${visited.has(p) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>{p}</span>
                  ))}
                </div>
                {data.postsCount === 0 && (
                  <p className="mt-3 text-xs text-slate-500">Bản đồ sẽ sáng lên khi bài review gắn tour của bạn được duyệt.</p>
                )}
                {data.nextBadgeHint && <p className="mt-3 text-xs text-slate-500">{data.nextBadgeHint}</p>}
              </div>
              <p className="font-heading text-[15px] font-bold text-slate-900">Bài gần đây</p>
              <RecentPosts posts={data.recentPosts} />
            </>
          )}
          {tab === 'posts' && <RecentPosts posts={data.recentPosts} />}
          {tab === 'saved' && (
            <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Bài đã lưu sẽ hiện ở đây.</p>
          )}
          {tab === 'points' &&
            (data.gopointHistory.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                Chưa có GoPoint. Bài review gắn tour được duyệt sẽ được cộng điểm.
              </p>
            ) : (
              <div className="space-y-2">
                {data.gopointHistory.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                    <span>{p.reason}</span>
                    <b className={p.delta >= 0 ? 'text-green-700' : 'text-rose-700'}>{p.delta > 0 ? '+' : ''}{p.delta} GoPoint</b>
                  </div>
                ))}
              </div>
            ))}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Huy hiệu</p>
            <ul className="mt-3 space-y-2">
              {data.badges.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{b.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.earned ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                    {b.remainingLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Tóm tắt uy tín</p>
            <p className="mt-2 text-sm text-slate-600">
              {data.helpfulCount > 0
                ? `Review của bạn đã nhận ${data.helpfulCount} lượt hữu ích từ cộng đồng.`
                : 'Chưa có lượt hữu ích nào. Chia sẻ trải nghiệm thật để giúp mọi người chọn tour phù hợp.'}
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="font-heading text-[15px] font-bold text-slate-900">Quyền riêng tư</p>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
              <span>Công khai hồ sơ</span>
              <button
                type="button"
                role="switch"
                aria-checked={data.isPublic}
                aria-label="Công khai hồ sơ"
                disabled={saving}
                onClick={() => void save({ isPublic: !data.isPublic })}
                className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${data.isPublic ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${data.isPublic ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};

export default CommunityProfile;
