import React from 'react';
import { api, type AdminSeller, type AdminSellerTour } from '../../api';

interface ReviewCenterProps {
  /** Token Seller Center của admin (lấy lúc đăng nhập). Rỗng = đăng nhập từ phiên cũ, cần đăng nhập lại. */
  token: string;
  onRelogin: () => void;
}

const BUSINESS_TYPES: Record<AdminSeller['business_type'], string> = {
  domestic_travel: 'Lữ hành nội địa',
  international_travel: 'Lữ hành quốc tế',
  tour_organizer: 'Đơn vị tổ chức tour',
};
const money = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const dmy = (s: string) => s.split('-').reverse().join('/');

/** Ô nhập lý do từ chối: bắt buộc, báo lỗi ngay dưới ô. */
const RejectBox: React.FC<{ onConfirm: (reason: string) => Promise<void>; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async () => {
    if (!reason.trim()) return setError('Vui lòng nhập lý do từ chối');
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lý do từ chối (người bán sẽ thấy)</label>
      <textarea
        value={reason}
        onChange={(e) => { setReason(e.target.value); setError(''); }}
        rows={3}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
        placeholder="Ví dụ: Ảnh giấy phép không rõ, vui lòng tải lại"
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? 'Đang gửi...' : 'Xác nhận từ chối'}
        </button>
        <button onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600">Hủy</button>
      </div>
    </div>
  );
};

const Actions: React.FC<{ onApprove: () => Promise<void>; onReject: (reason: string) => Promise<void> }> = ({ onApprove, onReject }) => {
  const [rejecting, setRejecting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const approve = async () => {
    setBusy(true);
    setError('');
    try { await onApprove(); } catch (e) { setError((e as Error).message); setBusy(false); }
  };
  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button onClick={approve} disabled={busy} className="rounded-full bg-[#3D72BB] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">Duyệt</button>
        <button onClick={() => setRejecting(true)} disabled={busy || rejecting} className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 disabled:opacity-60">Từ chối</button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      {rejecting && <RejectBox onConfirm={onReject} onCancel={() => setRejecting(false)} />}
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="text-sm text-slate-800">{children || '—'}</dd>
  </div>
);

function SellerList({ token }: { token: string }) {
  const [items, setItems] = React.useState<AdminSeller[] | null>(null);
  const [error, setError] = React.useState('');
  const load = React.useCallback(() => {
    api.adminListSellers(token).then(setItems).catch((e) => setError((e as Error).message));
  }, [token]);
  React.useEffect(load, [load]);

  // File giấy phép cần token → tải về rồi mở trong tab mới
  const openFile = async (url: string) => {
    const w = window.open('', '_blank');
    try {
      const blob = await api.fetchSellerFile(token, url);
      if (w) w.location.href = URL.createObjectURL(blob);
    } catch (e) {
      w?.close();
      alert((e as Error).message);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items) return <p className="text-sm text-slate-400">Đang tải...</p>;
  if (!items.length) return <p className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-card">Không có hồ sơ nào đang chờ duyệt.</p>;

  return (
    <div className="flex flex-col gap-4">
      {items.map((s) => (
        <div key={s.id} className="rounded-xl bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            {s.logo_url && <img src={s.logo_url} alt="" className="h-12 w-12 rounded-lg border border-slate-100 object-cover" />}
            <div>
              <p className="text-base font-bold text-slate-900">{s.business_name}</p>
              <p className="text-xs text-slate-500">{BUSINESS_TYPES[s.business_type]} · gửi lúc {new Date(s.created_at).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Row label="Mã số doanh nghiệp">{s.tax_code}</Row>
            <Row label="Người đại diện">{s.legal_representative}</Row>
            <Row label="Email">{s.email}</Row>
            <Row label="Số điện thoại">{s.phone}</Row>
            <Row label="Hotline">{s.hotline}</Row>
            <Row label="Website">{s.website}</Row>
            <Row label="Địa chỉ trụ sở">{s.address}</Row>
            <Row label="Số giấy phép lữ hành">{s.travel_license_number}</Row>
            <Row label="Ngày cấp">{s.travel_license_issued_at ? dmy(s.travel_license_issued_at) : ''}</Row>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.business_reg_file && <button onClick={() => openFile(s.business_reg_file!)} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-primary-700 hover:border-primary">Xem giấy đăng ký kinh doanh</button>}
            {s.travel_license_file && <button onClick={() => openFile(s.travel_license_file!)} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-primary-700 hover:border-primary">Xem giấy phép lữ hành</button>}
          </div>
          <Actions
            onApprove={async () => { await api.adminReviewSeller(token, s.id, 'approve'); load(); }}
            onReject={async (reason) => { await api.adminReviewSeller(token, s.id, 'reject', reason); load(); }}
          />
        </div>
      ))}
    </div>
  );
}

function TourList({ token }: { token: string }) {
  const [items, setItems] = React.useState<AdminSellerTour[] | null>(null);
  const [error, setError] = React.useState('');
  const load = React.useCallback(() => {
    api.adminListSellerTours(token).then(setItems).catch((e) => setError((e as Error).message));
  }, [token]);
  React.useEffect(load, [load]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items) return <p className="text-sm text-slate-400">Đang tải...</p>;
  if (!items.length) return <p className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-card">Không có tour nào đang chờ duyệt.</p>;

  return (
    <div className="flex flex-col gap-4">
      {items.map((t) => (
        <div key={t.id} className="rounded-xl bg-white p-5 shadow-card">
          <div className="flex gap-4">
            {t.coverImage && <img src={t.coverImage} alt="" className="h-24 w-36 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">Đơn vị: {t.seller_name ?? '—'} · {t.destination} · khởi hành từ {t.departure}</p>
              <p className="mt-1 text-sm text-slate-700">
                {t.duration}N{t.nights}Đ · {t.transport} · {t.hotelStars ? `${t.hotelStars} sao` : 'không khách sạn sao'} · <b>{money(t.price)}</b>
                {t.discountPrice ? ` (KM ${money(t.discountPrice)})` : ''}
              </p>
              <p className="text-xs text-slate-500">{t.departures.length} ngày khởi hành · {t.itinerary.length} ngày lịch trình</p>
            </div>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-primary-700">Xem chi tiết</summary>
            <div className="mt-2 flex flex-col gap-3 text-slate-700">
              {t.shortDescription && <p>{t.shortDescription}</p>}
              <div>
                <p className="font-semibold">Lịch trình</p>
                <ol className="ml-4 list-decimal">
                  {t.itinerary.map((d) => (
                    <li key={d.day_number}>
                      <b>{d.title || '(chưa có tiêu đề)'}</b>
                      {[d.has_breakfast && 'sáng', d.has_lunch && 'trưa', d.has_dinner && 'tối'].filter(Boolean).length > 0 &&
                        ` — bữa ${[d.has_breakfast && 'sáng', d.has_lunch && 'trưa', d.has_dinner && 'tối'].filter(Boolean).join(', ')}`}
                      {d.description && <span className="block text-xs text-slate-500">{d.description}</span>}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-semibold">Lịch khởi hành</p>
                <ul className="ml-4 list-disc">
                  {t.departures.map((d) => (
                    <li key={d.id}>{dmy(d.departure_date)} — {d.max_seats} chỗ{d.price ? ` — giá riêng ${money(d.price)}` : ''}{d.booking_deadline ? ` — hạn đặt ${dmy(d.booking_deadline)}` : ''}</li>
                  ))}
                </ul>
              </div>
              <p><b>Giá đã bao gồm:</b> {t.includes.join('; ') || '—'}</p>
              <p><b>Giá chưa bao gồm:</b> {t.excludes.join('; ') || '—'}</p>
              <p><b>Chính sách hủy hoàn:</b> {t.cancellationPolicy || '—'}</p>
              <p><b>Chính sách trẻ em:</b> {t.child_policy || '—'}</p>
              <p><b>Lưu ý:</b> {t.notes || '—'}</p>
            </div>
          </details>
          <Actions
            onApprove={async () => { await api.adminReviewSellerTour(token, t.id, 'approve'); load(); }}
            onReject={async (reason) => { await api.adminReviewSellerTour(token, t.id, 'reject', reason); load(); }}
          />
        </div>
      ))}
    </div>
  );
}

const ReviewCenter: React.FC<ReviewCenterProps> = ({ token, onRelogin }) => {
  const [tab, setTab] = React.useState<'sellers' | 'tours'>('sellers');

  if (!token) {
    return (
      <div className="max-w-xl rounded-xl bg-white p-6 shadow-card">
        <p className="font-semibold text-slate-900">Cần đăng nhập lại</p>
        <p className="mt-1 text-sm text-slate-500">Phiên đăng nhập này được tạo trước khi có Seller Center nên chưa có quyền duyệt. Hãy đăng xuất rồi đăng nhập lại.</p>
        <button onClick={onRelogin} className="mt-4 rounded-full bg-[#3D72BB] px-5 py-2 text-sm font-semibold text-white">Đăng xuất</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {([['sellers', 'Hồ sơ người bán'], ['tours', 'Tour chờ duyệt']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-[#3D72BB] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'sellers' ? <SellerList key="s" token={token} /> : <TourList key="t" token={token} />}
    </div>
  );
};

export default ReviewCenter;
