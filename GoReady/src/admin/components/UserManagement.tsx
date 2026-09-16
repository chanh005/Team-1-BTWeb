import React from 'react';
import type { AccountUser } from '../../types';
import { formatShortDate } from '../../utils/format';

interface UserManagementProps {
  users: AccountUser[];
  onToggleStatus: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onToggleStatus }) => {
  const [query, setQuery] = React.useState('');

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên hoặc email..."
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary sm:max-w-xs"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Liên hệ</th>
              <th className="px-4 py-3">Ngày tham gia</th>
              <th className="px-4 py-3">Số đơn đặt</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {u.name.split(' ').slice(-1)[0]?.[0] ?? 'U'}
                    </span>
                    <span className="font-semibold text-slate-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p>{u.email}</p>
                  <p className="text-xs text-slate-400">{u.phone}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatShortDate(u.joinedAt)}</td>
                <td className="px-4 py-3 text-slate-600">{u.totalBookings}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {u.status === 'active' ? 'Hoạt động' : 'Đã khoá'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onToggleStatus(u.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      u.status === 'active'
                        ? 'border-red-200 text-red-500 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {u.status === 'active' ? 'Khoá tài khoản' : 'Mở khoá'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
