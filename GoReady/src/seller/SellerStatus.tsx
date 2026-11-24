import React from 'react';
import type { SellerProfile } from '../api';
import { Card, Logo, Tag, outlineBtn, primaryBtn } from './ui';

interface Props {
  seller: SellerProfile;
  onRefresh: () => void;
  onLogout: () => void;
  onEnter: () => void;
}

/** 3 chấm tiến trình: filled = đã xong, hollow = đang chờ / chưa tới. */
const Steps: React.FC<{ items: { label: string; state: 'done' | 'current' | 'todo' }[] }> = ({ items }) => (
  <ul className="mt-4 flex flex-col gap-3">
    {items.map((it) => (
      <li key={it.label} className="flex items-center gap-3 text-sm text-slate-800">
        <span
          className={`h-5 w-5 rounded-full border-2 ${
            it.state === 'done' ? 'border-[#3D72BB] bg-[#3D72BB]' : it.state === 'current' ? 'border-[#3D72BB] bg-white' : 'border-slate-300 bg-white'
          }`}
        />
        {it.label}
      </li>
    ))}
  </ul>
);

const SellerStatus: React.FC<Props> = ({ seller, onRefresh, onLogout, onEnter }) => {
  // Hồ sơ đang chờ: tự hỏi lại server mỗi 10 giây để khi Admin duyệt thì trang tự đổi
  React.useEffect(() => {
    if (seller.status !== 'pending') return;
    const id = window.setInterval(onRefresh, 10000);
    return () => window.clearInterval(id);
  }, [seller.status, onRefresh]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-slate-700">{seller.business_name}</span>
          <button onClick={onLogout} className="text-slate-500 hover:text-red-500">Đăng xuất</button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Trạng thái hồ sơ người bán</h1>

        <Card className="mt-6">
          {seller.status === 'pending' && (
            <>
              <Tag>Chờ duyệt</Tag>
              <h2 className="mt-3 text-xl font-bold text-slate-900">Hồ sơ đang được xác minh</h2>
              <p className="mt-1 text-sm text-slate-500">Admin sẽ kiểm tra thông tin doanh nghiệp và giấy phép. Kết quả sẽ hiện ngay tại trang này.</p>
              <Steps items={[{ label: 'Đã gửi hồ sơ', state: 'done' }, { label: 'Admin đang xác minh', state: 'current' }, { label: 'Kết quả duyệt', state: 'todo' }]} />
              <button disabled className="mt-5 cursor-not-allowed rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-400">Đăng tour (chưa mở)</button>
            </>
          )}

          {seller.status === 'rejected' && (
            <>
              <Tag tone="bad">Cần bổ sung</Tag>
              <h2 className="mt-3 text-xl font-bold text-slate-900">Hồ sơ chưa được duyệt</h2>
              <p className="mt-1 text-sm text-slate-500">Admin đã gửi lý do để bạn chỉnh sửa và gửi lại.</p>
              <div className="mt-4 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">Lý do từ Admin</p>
                <p className="mt-1">{seller.reject_reason || '(không có lý do)'}</p>
              </div>
              <a href="#/sua-ho-so" className={`${primaryBtn} mt-5 inline-block`}>Sửa và gửi lại hồ sơ</a>
            </>
          )}

          {seller.status === 'approved' && (
            <>
              <Tag tone="ok">Đã duyệt</Tag>
              <h2 className="mt-3 text-xl font-bold text-slate-900">Tài khoản đã được kích hoạt</h2>
              <p className="mt-1 text-sm text-slate-500">Bạn có thể đăng tour và nhận booking trên GoReady.</p>
              <Steps items={[{ label: 'Đã gửi hồ sơ', state: 'done' }, { label: 'Admin đã xác minh', state: 'done' }, { label: 'Được phép đăng bán', state: 'done' }]} />
              <button onClick={onEnter} className={`${primaryBtn} mt-5`}>Vào Seller Center</button>
            </>
          )}
        </Card>

        <button onClick={onRefresh} className={`${outlineBtn} mt-4`}>Tải lại trạng thái</button>
      </main>
    </div>
  );
};

export default SellerStatus;
