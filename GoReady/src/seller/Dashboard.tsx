import React from 'react';
import { api, type SellerDashboard, type SellerProfile } from '../api';
import { Tag, outlineBtn, primaryBtn } from './ui';

interface Props {
  token: string;
  seller: SellerProfile;
  onUnauthorized: () => void;
  /** Báo số booking chờ xác nhận lên khung (huy hiệu trên menu Booking). */
  onPendingCount: (n: number) => void;
}

const dm = (s: string | null) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '—');
const guestsText = (adults: number, children: number, infants: number) =>
  [adults > 0 && `${adults} NL`, children > 0 && `${children} TE`, infants > 0 && `${infants} EB`].filter(Boolean).join(', ') || '—';

/** Thẻ số liệu: bấm để sang danh sách đã lọc sẵn. */
const StatCard: React.FC<{ label: string; value: number | null; hint: string; href: string }> = ({ label, value, hint, href }) => (
  <a href={href} className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#3D72BB] hover:shadow-soft">
    <p className="text-sm text-slate-600">{label}</p>
    <p className="mt-2 text-4xl font-bold text-slate-900">{value === null ? <span className="inline-block h-9 w-14 animate-pulse rounded bg-slate-100" /> : String(value).padStart(2, '0')}</p>
    <p className="mt-1 text-sm text-slate-500">{hint}</p>
  </a>
);

const Dashboard: React.FC<Props> = ({ token, seller, onUnauthorized, onPendingCount }) => {
  const [data, setData] = React.useState<SellerDashboard | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    api.sellerDashboard(token)
      .then((d) => { setData(d); setError(''); onPendingCount(d.counts.pending_bookings); })
      .catch((err) => {
        if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
        setError((err as Error).message || 'Không tải được dữ liệu tổng quan');
      });
  }, [token, onUnauthorized, onPendingCount]);
  React.useEffect(load, [load]);

  const c = data?.counts;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Xin chào, {seller.business_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Việc cần làm hôm nay trong một màn hình.</p>
        </div>
        <a href="#/tour-moi" className={primaryBtn}>+ Đăng tour mới</a>
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={load} className={outlineBtn}>Thử lại</button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Booking chờ xác nhận" value={c?.pending_bookings ?? null} hint="Cần xử lý sớm" href="#/booking?status=pending" />
        <StatCard label="Tour đang hiển thị" value={c?.active_tours ?? null} hint="Trạng thái đang bán" href="#/tour-cua-toi?status=active" />
        <StatCard label="Tour chờ Admin duyệt" value={c?.pending_review_tours ?? null} hint="Chưa hiển thị cho khách" href="#/tour-cua-toi?status=pending_review" />
        <StatCard label="Khởi hành trong 7 ngày" value={c?.departing_soon_bookings ?? null} hint="Cần liên hệ khách" href="#/booking?status=confirmed" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Booking cần xử lý */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Booking cần xử lý</h2>
            <a href="#/booking?status=pending" className="text-sm font-semibold text-[#3D72BB] underline">Xem tất cả</a>
          </div>
          {!data ? (
            <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
          ) : data.pending_bookings.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Chưa có booking nào cần xử lý.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Mã</th>
                    <th className="py-2 pr-3">Tour</th>
                    <th className="py-2 pr-3">Ngày đi</th>
                    <th className="py-2 pr-3">Khách</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pending_bookings.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-3 font-semibold text-slate-900"><a href={`#/booking?status=pending&id=${encodeURIComponent(b.id)}`} className="hover:text-[#3D72BB]">#{b.bookingCode}</a></td>
                      <td className="py-3 pr-3 text-slate-700">{b.tour_name}</td>
                      <td className="py-3 pr-3 text-slate-700">{dm(b.start_date)}</td>
                      <td className="py-3 pr-3 text-slate-700">{guestsText(b.adults, b.children, b.infants)}</td>
                      <td className="py-3"><Tag tone="warn">Chờ xác nhận</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tour cần chú ý */}
        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Tour cần chú ý</h2>
          {!data ? (
            <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
          ) : data.attention.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Không có tour nào cần chú ý. Mọi thứ đang ổn.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {data.attention.map((a) => (
                <li key={`${a.type}-${a.tour_id}`} className="flex items-center justify-between gap-3 text-sm">
                  <a href={`#/tour/${a.tour_id}/sua`} className="min-w-0 text-slate-800 hover:text-[#3D72BB]">
                    <span className="font-semibold">{a.tour_name || '(chưa đặt tên)'}</span>{' '}
                    {a.type === 'low_seats' && 'sắp hết chỗ'}
                    {a.type === 'rejected' && 'bị từ chối'}
                    {a.type === 'no_departure' && 'chưa có ngày khởi hành'}
                    {a.type === 'rejected' && a.reject_reason && <span className="block text-xs text-red-600">Lý do: {a.reject_reason}</span>}
                  </a>
                  {a.type === 'low_seats' && <Tag>Còn {a.remaining_seats}</Tag>}
                  {a.type === 'rejected' && <a href={`#/tour/${a.tour_id}/sua`} className={`${outlineBtn} !px-4 !py-1`}>Sửa</a>}
                  {a.type === 'no_departure' && <a href={`#/tour/${a.tour_id}/sua`} className={`${outlineBtn} !px-4 !py-1`}>Thêm lịch</a>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
