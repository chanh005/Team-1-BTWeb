import React from 'react';
import { api, type SellerTourRow, type SellerTourStatus } from '../api';
import { Tag, inputClass, outlineBtn, primaryBtn } from './ui';

interface Props {
  token: string;
  onUnauthorized: () => void;
  /** Tab trạng thái chọn sẵn (vd. từ thẻ "Tour chờ Admin duyệt" ở Tổng quan). */
  initialStatus?: '' | SellerTourStatus;
}

const TABS: { value: '' | SellerTourStatus; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending_review', label: 'Chờ duyệt' },
  { value: 'active', label: 'Đang bán' },
  { value: 'rejected', label: 'Bị từ chối' },
  { value: 'hidden', label: 'Đã ẩn' },
];

const STATUS_LABEL: Record<SellerTourStatus, { text: string; tone: 'default' | 'ok' | 'warn' | 'bad' | 'muted' }> = {
  draft: { text: 'Nháp', tone: 'muted' },
  pending_review: { text: 'Chờ duyệt', tone: 'warn' },
  active: { text: 'Đang bán', tone: 'ok' },
  rejected: { text: 'Bị từ chối', tone: 'bad' },
  hidden: { text: 'Đã ẩn', tone: 'default' },
};

const money = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;
const rowBtn = 'rounded-full border border-[#3D72BB] px-4 py-1.5 text-sm font-semibold text-[#3D72BB] hover:bg-primary-50 disabled:opacity-50';

const MyTours: React.FC<Props> = ({ token, onUnauthorized, initialStatus = '' }) => {
  const [status, setStatus] = React.useState<'' | SellerTourStatus>(initialStatus);
  const [search, setSearch] = React.useState('');
  const [q, setQ] = React.useState('');
  const [data, setData] = React.useState<{ tours: SellerTourRow[]; counts: Record<SellerTourStatus, number> } | null>(null);
  const [error, setError] = React.useState('');
  const [busyId, setBusyId] = React.useState('');

  // Chờ người dùng gõ xong 0,3 giây rồi mới tìm
  React.useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const handleError = React.useCallback((err: unknown) => {
    if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
    setError((err as Error).message || 'Có lỗi xảy ra, vui lòng thử lại');
  }, [onUnauthorized]);

  const load = React.useCallback(() => {
    api.sellerListTours(token, { status: status || undefined, q: q || undefined }).then((d) => { setData(d); setError(''); }).catch(handleError);
  }, [token, status, q, handleError]);
  React.useEffect(load, [load]);

  const act = async (id: string, run: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await run();
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId('');
    }
  };

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tour của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">Đăng, sửa, ẩn tour và theo dõi trạng thái duyệt.</p>
        </div>
        <a href="#/tour-moi" className={primaryBtn}>+ Đăng tour mới</a>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = data ? (t.value ? data.counts[t.value] : total) : null;
          return (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${status === t.value ? 'border-[#3D72BB] bg-[#3D72BB] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
            >
              {t.label}{count !== null && ` (${count})`}
            </button>
          );
        })}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo tên tour hoặc điểm đến"
        className={`${inputClass()} mt-4 max-w-md !rounded-full !px-5`}
      />

      {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Tour</th>
              <th className="px-3 py-3">Khởi hành từ</th>
              <th className="px-3 py-3">Thời lượng</th>
              <th className="px-3 py-3">Giá / khách</th>
              <th className="px-3 py-3">Chỗ còn / tối đa</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!data && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>}
            {data && data.tours.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {q || status ? 'Không có tour nào khớp bộ lọc.' : 'Bạn chưa có tour nào. Bấm "+ Đăng tour mới" để bắt đầu.'}
                </td>
              </tr>
            )}
            {data?.tours.map((t) => {
              const st = STATUS_LABEL[t.status];
              const hasInfo = t.status !== 'draft' || t.price > 0;
              const busy = busyId === t.id;
              return (
                <tr key={t.id} className="border-b border-slate-100 align-middle last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.coverImage ? (
                        <img src={t.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-16 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-100" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.name || '(chưa đặt tên)'}</p>
                        <p className="text-xs text-slate-500">
                          {t.status === 'rejected' && t.reject_reason
                            ? <span className="text-red-600">Lý do từ chối: {t.reject_reason}</span>
                            : t.status === 'draft'
                              ? 'Chưa hoàn thiện'
                              : `${t.transport || '—'} · ${t.hotelStars ? `${t.hotelStars} sao` : 'không khách sạn sao'}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{t.departure || '—'}</td>
                  <td className="px-3 py-3 text-slate-700">{hasInfo && t.duration ? `${t.duration}N${t.nights}Đ` : '—'}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{t.price > 0 ? money(t.price) : '—'}</td>
                  <td className="px-3 py-3 text-slate-700">{t.max_seats > 0 ? `${t.max_seats - t.booked_seats} / ${t.max_seats}` : '—'}</td>
                  <td className="px-3 py-3"><Tag tone={st.tone}>{st.text}</Tag></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {t.status === 'active' && (
                        <>
                          <a href={`#/tour/${t.id}/sua`} className={rowBtn}>Sửa</a>
                          <button disabled={busy} onClick={() => act(t.id, () => api.sellerTourAction(token, t.id, 'hide'))} className={rowBtn}>Ẩn</button>
                        </>
                      )}
                      {t.status === 'hidden' && (
                        <>
                          <a href={`#/tour/${t.id}/sua`} className={rowBtn}>Sửa</a>
                          <button disabled={busy} onClick={() => act(t.id, () => api.sellerTourAction(token, t.id, 'show'))} className={rowBtn}>Hiện</button>
                        </>
                      )}
                      {t.status === 'pending_review' && <a href={`#/tour/${t.id}/sua`} className={rowBtn}>Xem</a>}
                      {t.status === 'rejected' && <a href={`#/tour/${t.id}/sua`} className={rowBtn}>Sửa và gửi lại</a>}
                      {t.status === 'draft' && (
                        <>
                          <a href={`#/tour/${t.id}/sua`} className={rowBtn}>Tiếp tục</a>
                          <button
                            disabled={busy}
                            onClick={() => window.confirm(`Xóa tour nháp "${t.name || '(chưa đặt tên)'}"? Không thể khôi phục.`) && act(t.id, () => api.sellerDeleteTour(token, t.id))}
                            className={rowBtn}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">Chỉ tour <b>Đang bán</b> mới hiện cho khách. Sửa giá hoặc lịch trình của tour đang bán sẽ đưa tour về <b>Chờ duyệt</b>.</p>
      <button onClick={load} className={`${outlineBtn} mt-3`}>Tải lại</button>
    </div>
  );
};

export default MyTours;
