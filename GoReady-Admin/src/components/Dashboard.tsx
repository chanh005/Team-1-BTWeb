import React from 'react';
import type { Booking, Tour } from '../types';
import type { AdminUser } from '../data/mockUsers';
import { formatVND } from '../utils/format';

interface DashboardProps {
  tours: Tour[];
  bookings: Booking[];
  users: AdminUser[];
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  confirmed: 'Đã xác nhận',
  upcoming: 'Sắp tới',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

const Dashboard: React.FC<DashboardProps> = ({ tours, bookings, users }) => {
  const revenue = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalPrice, 0);
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const topTours = [...tours].sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 5);
  const recentBookings = [...bookings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);

  const stats = [
    { label: 'Tổng số tour', value: tours.length.toString(), icon: '🧭' },
    { label: 'Tổng đơn đặt', value: bookings.length.toString(), icon: '🎫' },
    { label: 'Người dùng hoạt động', value: `${activeUsers}/${users.length}`, icon: '👤' },
    { label: 'Doanh thu ước tính', value: formatVND(revenue), icon: '💰' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</span>
              <span className="text-lg" aria-hidden>{s.icon}</span>
            </div>
            <p className="mt-3 font-heading text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <h2 className="font-heading text-base font-bold text-slate-900">Tour phổ biến nhất</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {topTours.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{i + 1}</span>
                <img src={t.coverImage} alt={t.name} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.destination}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-500">{t.bookingCount.toLocaleString('vi-VN')} đã đặt</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
          <h2 className="font-heading text-base font-bold text-slate-900">Đơn đặt tour gần đây</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {recentBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{b.contactName}</p>
                  <p className="text-xs text-slate-400">#{b.bookingCode}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {STATUS_LABEL[b.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
