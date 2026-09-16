import React from 'react';
import type { Booking, BookingStatus, Tour } from '../types';
import { formatShortDate, formatVND } from '../utils/format';

interface BookingManagementProps {
  bookings: Booking[];
  tours: Tour[];
  onChangeStatus: (bookingId: string, status: BookingStatus) => void;
}

const STATUS_OPTIONS: { value: BookingStatus; label: string; badge: string }[] = [
  { value: 'upcoming', label: 'Sắp tới', badge: 'bg-amber-50 text-amber-600' },
  { value: 'confirmed', label: 'Đã xác nhận', badge: 'bg-primary-50 text-primary-700' },
  { value: 'completed', label: 'Hoàn thành', badge: 'bg-emerald-50 text-emerald-600' },
  { value: 'cancelled', label: 'Đã huỷ', badge: 'bg-red-50 text-red-500' },
];

const BookingManagement: React.FC<BookingManagementProps> = ({ bookings, tours, onChangeStatus }) => {
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | 'all'>('all');

  const tourById = React.useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);

  const filtered = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${statusFilter === 'all' ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}
        >
          Tất cả ({bookings.length})
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${statusFilter === s.value ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}`}
          >
            {s.label} ({bookings.filter((b) => b.status === s.value).length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-soft">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Tour</th>
              <th className="px-4 py-3">Khởi hành</th>
              <th className="px-4 py-3">Tổng tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((b) => {
              const tour = tourById.get(b.tourId);
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === b.status)!;
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{b.bookingCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{b.contactName}</p>
                    <p className="text-xs text-slate-400">{b.contactPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tour?.name ?? b.tourId}</td>
                  <td className="px-4 py-3 text-slate-600">{formatShortDate(b.departureDate)}</td>
                  <td className="px-4 py-3 font-semibold text-primary-700">{formatVND(b.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={(e) => onChangeStatus(b.id, e.target.value as BookingStatus)}
                      className={`rounded-full border-none px-2.5 py-1 text-[11px] font-semibold outline-none ${statusOpt.badge}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  Không có đơn đặt tour nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingManagement;
