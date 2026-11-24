import React from 'react';
import { api, type SellerDepartureRow } from '../api';
import { Tag, outlineBtn, primaryBtn } from './ui';

interface Props {
  token: string;
  onUnauthorized: () => void;
}

const dmy = (s: string) => s.split('-').reverse().join('/');
const money = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;

const DepartureSchedule: React.FC<Props> = ({ token, onUnauthorized }) => {
  const [scope, setScope] = React.useState<'upcoming' | 'past'>('upcoming');
  const [rows, setRows] = React.useState<SellerDepartureRow[] | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    setRows(null);
    api.sellerDepartures(token, scope)
      .then((d) => { setRows(d.departures); setError(''); })
      .catch((err) => {
        if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
        setError((err as Error).message || 'Không tải được lịch khởi hành');
      });
  }, [token, scope, onUnauthorized]);
  React.useEffect(load, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lịch khởi hành</h1>
          <p className="mt-1 text-sm text-slate-500">Tất cả ngày khởi hành của các tour, kèm số chỗ đã xác nhận và số chỗ đang chờ xác nhận.</p>
        </div>
        <a href="#/tour-cua-toi" className={primaryBtn}>Quản lý tour</a>
      </div>

      <div className="mt-5 flex gap-2">
        {([['upcoming', 'Sắp tới'], ['past', 'Đã qua']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setScope(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${scope === v ? 'border-[#3D72BB] bg-[#3D72BB] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}>{label}</button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Ngày đi</th>
              <th className="px-3 py-3">Tour</th>
              <th className="px-3 py-3">Giá / khách</th>
              <th className="px-3 py-3">Chỗ đã xác nhận / tối đa</th>
              <th className="px-3 py-3">Chờ xác nhận</th>
              <th className="px-3 py-3">Chốt booking</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!rows && !error && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>}
            {rows && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{scope === 'upcoming' ? 'Chưa có ngày khởi hành sắp tới. Hãy thêm lịch trong form sửa tour.' : 'Chưa có ngày khởi hành nào đã qua.'}</td></tr>
            )}
            {rows?.map((d) => {
              const full = d.max_seats > 0 && d.booked_seats >= d.max_seats;
              const pct = d.max_seats > 0 ? Math.min(100, Math.round((d.booked_seats / d.max_seats) * 100)) : 0;
              return (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {dmy(d.departure_date)}
                    {d.end_date !== d.departure_date && <span className="block text-xs font-normal text-slate-500">→ {dmy(d.end_date)}</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-800">
                    {d.tour_name || '(chưa đặt tên)'}
                    {d.tour_status !== 'active' && <span className="ml-2 align-middle"><Tag tone="muted">{d.tour_status === 'hidden' ? 'Đã ẩn' : d.tour_status === 'pending_review' ? 'Chờ duyệt' : d.tour_status === 'rejected' ? 'Bị từ chối' : 'Nháp'}</Tag></span>}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{money(d.price ?? d.tour_price)}{d.price !== null && <span className="block text-xs text-slate-500">giá riêng</span>}</td>
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${full ? 'text-red-600' : 'text-slate-900'}`}>{d.booked_seats} / {d.max_seats}</span>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${full ? 'bg-red-500' : 'bg-[#3D72BB]'}`} style={{ width: `${pct}%` }} /></div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{d.pending_seats > 0 ? <a href="#/booking?status=pending" className="font-semibold text-[#3D72BB] hover:underline">{d.pending_seats} chỗ</a> : '—'}</td>
                  <td className="px-3 py-3 text-slate-700">{d.booking_deadline ? dmy(d.booking_deadline) : '—'}</td>
                  <td className="px-3 py-3"><a href={`#/tour/${d.tour_id}/sua`} className={`${outlineBtn} !px-4 !py-1`}>Sửa tour</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">Số chỗ chỉ tăng khi bạn xác nhận booking. "Chờ xác nhận" là số khách của các booking chưa được xử lý.</p>
    </div>
  );
};

export default DepartureSchedule;
