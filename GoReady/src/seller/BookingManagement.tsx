import React from 'react';
import { api, type SellerBooking, type SellerBookingCounts } from '../api';
import { Tag, outlineBtn, primaryBtn } from './ui';

interface Props {
  token: string;
  onUnauthorized: () => void;
  /** Gọi sau mỗi hành động để cập nhật số trên menu "Booking". */
  onChanged: () => void;
}

type Tab = 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'closed';
const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'ongoing', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'closed', label: 'Đã hủy / từ chối' },
];

const money = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;
const dmy = (s: string | null) => (s ? s.split('-').reverse().join('/') : '—');
const dm = (s: string | null) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '—');

const guestsText = (b: SellerBooking, short = false) =>
  [
    b.adults > 0 && (short ? `${b.adults} NL` : `${b.adults} người lớn`),
    b.children > 0 && (short ? `${b.children} TE` : `${b.children} trẻ em`),
    b.infants > 0 && (short ? `${b.infants} EB` : `${b.infants} em bé`),
  ]
    .filter(Boolean)
    .join(short ? ', ' : ', ') || '—';

const statusTag = (b: SellerBooking): { text: string; tone: 'default' | 'ok' | 'warn' | 'bad' | 'muted' } => {
  if (b.status === 'pending') return { text: 'Chờ xác nhận', tone: 'warn' };
  if (b.status === 'confirmed') return b.ongoing ? { text: 'Đang diễn ra', tone: 'default' } : { text: 'Đã xác nhận', tone: 'ok' };
  if (b.status === 'completed') return { text: 'Hoàn thành', tone: 'ok' };
  if (b.status === 'rejected') return { text: 'Đã từ chối', tone: 'bad' };
  return { text: 'Khách đã hủy', tone: 'bad' };
};

/** Mốc nào đã xong / đang tới. "Khách thanh toán" chưa có chức năng (chờ chốt mô hình thanh toán) nên luôn ở dạng chờ. */
function timeline(b: SellerBooking): { label: string; state: 'done' | 'current' | 'todo' }[] {
  const confirmed = b.status === 'confirmed' || b.status === 'completed';
  return [
    { label: 'Khách gửi yêu cầu', state: 'done' },
    { label: 'Doanh nghiệp xác nhận', state: confirmed ? 'done' : b.status === 'pending' ? 'current' : 'todo' },
    { label: 'Khách thanh toán', state: 'todo' },
    { label: 'Tổ chức tour', state: b.status === 'completed' ? 'done' : b.status === 'confirmed' ? (b.ongoing ? 'current' : 'todo') : 'todo' },
    { label: 'Hoàn thành', state: b.status === 'completed' ? 'done' : b.status === 'confirmed' && b.can_complete ? 'current' : 'todo' },
  ];
}

const Row: React.FC<{ label: string; children: React.ReactNode; strong?: boolean }> = ({ label, children, strong }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className={`text-right text-slate-800 ${strong ? 'font-bold' : ''}`}>{children}</span>
  </div>
);

const BookingManagement: React.FC<Props> = ({ token, onUnauthorized, onChanged }) => {
  const [tab, setTab] = React.useState<Tab>('pending');
  const [data, setData] = React.useState<{ bookings: SellerBooking[]; counts: SellerBookingCounts } | null>(null);
  const [selectedId, setSelectedId] = React.useState('');
  const [detail, setDetail] = React.useState<SellerBooking | null>(null);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [error, setError] = React.useState('');

  const handleError = React.useCallback((err: unknown) => {
    if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
    setError((err as Error).message || 'Có lỗi xảy ra, vui lòng thử lại');
  }, [onUnauthorized]);

  const load = React.useCallback(() => {
    api.sellerListBookings(token, tab).then((d) => { setData(d); setError(''); }).catch(handleError);
  }, [token, tab, handleError]);
  React.useEffect(load, [load]);

  // Đang xem tab nào thì tự chọn booking đầu tiên của tab đó (nếu booking đang chọn không còn ở tab này)
  React.useEffect(() => {
    if (!data) return;
    if (!data.bookings.some((b) => b.id === selectedId)) setSelectedId(data.bookings[0]?.id ?? '');
  }, [data, selectedId]);

  // Chi tiết đầy đủ (kèm số chỗ còn lại của ngày khởi hành) lấy mới từ server mỗi khi chọn booking
  React.useEffect(() => {
    setNote('');
    setNoteError('');
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    api.sellerGetBooking(token, selectedId).then((b) => { if (!cancelled) setDetail(b); }).catch(handleError);
    return () => { cancelled = true; };
  }, [token, selectedId, handleError]);

  const run = async (action: 'confirm' | 'reject' | 'complete') => {
    if (!detail) return;
    if (action === 'reject' && !note.trim()) {
      setNoteError('Vui lòng nhập lý do từ chối để gửi cho khách');
      return;
    }
    setBusy(true);
    setMessage(null);
    setNoteError('');
    try {
      const updated = await api.sellerBookingAction(token, detail.id, action, note.trim() || undefined);
      setDetail(updated); // cập nhật trạng thái ngay trên màn hình
      setMessage({
        tone: 'ok',
        text: action === 'confirm' ? `Đã xác nhận booking #${updated.bookingCode}. Số chỗ của ngày khởi hành đã được trừ.`
          : action === 'reject' ? `Đã từ chối booking #${updated.bookingCode}. Lý do đã được gửi cho khách.`
            : `Đã đánh dấu hoàn thành booking #${updated.bookingCode}.`,
      });
      setNote('');
      load();
      onChanged();
    } catch (err) {
      if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      if (fields?.seller_note) setNoteError(fields.seller_note);
      else setMessage({ tone: 'bad', text: (err as Error).message || 'Không thực hiện được, vui lòng thử lại' });
      // Trạng thái có thể đã đổi (vd. bấm hai lần): lấy lại bản mới nhất
      api.sellerGetBooking(token, detail.id).then(setDetail).catch(() => {});
      load();
    } finally {
      setBusy(false);
    }
  };

  const guests = detail ? detail.adults + detail.children : 0;
  const notEnough = detail?.status === 'pending' && detail.remaining_seats !== null && guests > detail.remaining_seats;
  const isPending = detail?.status === 'pending';

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Quản lý booking</h1>
      <p className="mt-1 text-sm text-slate-500">Nhận yêu cầu đặt tour, xác nhận hoặc từ chối, rồi đánh dấu hoàn thành sau chuyến đi.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setMessage(null); }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === t.value ? 'border-[#3D72BB] bg-[#3D72BB] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'}`}
          >
            {t.label}{data && ` (${data.counts[t.value]})`}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(280px,380px)_1fr]">
        {/* Danh sách */}
        <div className="flex flex-col gap-3">
          {!data && <p className="text-sm text-slate-400">Đang tải...</p>}
          {data && data.bookings.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Không có booking nào trong mục này.</div>
          )}
          {data?.bookings.map((b) => {
            const tag = statusTag(b);
            return (
              <button
                key={b.id}
                onClick={() => { setSelectedId(b.id); setMessage(null); }}
                className={`rounded-xl border bg-white p-4 text-left transition ${selectedId === b.id ? 'border-[#3D72BB] bg-primary-50/60' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">#{b.bookingCode}</span>
                  <Tag tone={tag.tone}>{tag.text}</Tag>
                </div>
                <p className="mt-1 text-sm text-slate-800">{b.tour_name}</p>
                <p className="text-xs text-slate-500">Khởi hành {dm(b.start_date)} · {guestsText(b, true)}</p>
              </button>
            );
          })}
          <button onClick={load} className={`${outlineBtn} self-start`}>Tải lại</button>
        </div>

        {/* Chi tiết */}
        <div>
          {!detail ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chọn một booking ở bên trái để xem chi tiết.</div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900">Booking #{detail.bookingCode}</h2>
                <Tag tone={statusTag(detail).tone}>{statusTag(detail).text}</Tag>
              </div>

              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {timeline(detail).map((s) => (
                  <li key={s.label} className={`flex items-center gap-2 text-sm ${s.label === 'Khách thanh toán' ? 'text-slate-400' : 'text-slate-700'}`} title={s.label === 'Khách thanh toán' ? 'Chưa áp dụng: đang chờ chốt mô hình thanh toán' : undefined}>
                    <span className={`h-4 w-4 rounded-full border-2 ${s.state === 'done' ? 'border-[#3D72BB] bg-[#3D72BB]' : s.state === 'current' ? 'border-[#3D72BB] bg-white' : 'border-slate-300 bg-white'}`} />
                    {s.label}
                  </li>
                ))}
              </ul>
              {(detail.status === 'rejected' || detail.status === 'cancelled') && (
                <p className="mt-2 text-sm font-semibold text-red-600">{detail.status === 'rejected' ? 'Bạn đã từ chối booking này.' : 'Khách đã hủy booking này.'}</p>
              )}

              <h3 className="mt-5 text-sm font-bold text-slate-900">Thông tin chuyến đi</h3>
              <div className="mt-1">
                <Row label="Tour">{detail.tour_name}</Row>
                <Row label="Ngày khởi hành">{dmy(detail.start_date)}{detail.end_date && detail.end_date !== detail.start_date ? ` → ${dmy(detail.end_date)}` : ''}</Row>
                <Row label="Số khách">{guestsText(detail)}</Row>
                <Row label="Tổng tiền">{money(detail.totalPrice)}</Row>
                <Row label="Tình trạng chỗ ngày này" strong>
                  {detail.remaining_seats === null ? 'Chưa gắn ngày khởi hành' : `Còn ${detail.remaining_seats} / ${detail.max_seats} chỗ`}
                </Row>
              </div>
              {notEnough && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  Không đủ chỗ: booking cần {guests} chỗ nhưng ngày này chỉ còn {detail.remaining_seats}. Bạn không thể xác nhận, hãy từ chối hoặc tăng số chỗ trong lịch khởi hành.
                </p>
              )}

              <h3 className="mt-5 text-sm font-bold text-slate-900">Khách hàng</h3>
              <div className="mt-1">
                <Row label="Họ tên">{detail.contactName}</Row>
                <Row label="Số điện thoại">{detail.contactPhone}</Row>
                <Row label="Email">{detail.contactEmail}</Row>
                <Row label="Ghi chú của khách">{detail.note || '—'}</Row>
              </div>

              <div className="mt-5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ghi chú / lý do từ chối (gửi cho khách)</label>
                {isPending ? (
                  <>
                    <textarea
                      value={note}
                      onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
                      rows={3}
                      placeholder="Bắt buộc nhập nếu từ chối"
                      className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-primary ${noteError ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    {noteError && <p className="mt-1 text-xs font-medium text-red-600">{noteError}</p>}
                  </>
                ) : (
                  <p className="mt-1 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">{detail.seller_note || '—'}</p>
                )}
              </div>

              {message && (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600'}`}>
                  {message.text}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={() => run('confirm')} disabled={busy || !isPending || notEnough} className={primaryBtn}>Xác nhận booking</button>
                <button onClick={() => run('reject')} disabled={busy || !isPending} className={outlineBtn}>Từ chối</button>
                <button
                  onClick={() => run('complete')}
                  disabled={busy || !(detail.status === 'confirmed' && detail.can_complete)}
                  className={outlineBtn}
                >
                  Đánh dấu hoàn thành
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Nút "Đánh dấu hoàn thành" chỉ mở sau ngày kết thúc tour{detail.end_date ? ` (${dmy(detail.end_date)})` : ''}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingManagement;
