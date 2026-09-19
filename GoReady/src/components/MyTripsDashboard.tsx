import React from 'react';
import type { AiPlannerResult, Booking, ChecklistCategory, ChecklistItem, Tour } from '../types';
import { formatVND, formatDateLong } from '../utils/format';

interface MyTripsDashboardProps {
  bookings: Booking[];
  tours: Tour[];
  checklist: ChecklistItem[];
  onToggleChecklist: (id: string) => void;
  onAddChecklistItem: (category: ChecklistCategory, label: string) => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  aiPlans: AiPlannerResult[];
}

// Mirrors the tiers described in "Chính sách hoàn hủy".
const refundPercentFor = (daysUntilDeparture: number): number => {
  if (daysUntilDeparture >= 30) return 90;
  if (daysUntilDeparture >= 15) return 50;
  if (daysUntilDeparture >= 7) return 30;
  return 0;
};

const CATEGORIES: ChecklistCategory[] = ['Giấy tờ tùy thân', 'Quần áo & Giày dép', 'Thuốc men & Y tế', 'Thiết bị điện tử & Tiền tệ'];

const useCountdown = (targetIso: string) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, expired: diff <= 0 };
};

const CountdownBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
    <span className="font-heading text-xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
    <span className="text-[10px] uppercase tracking-wide text-white/80">{label}</span>
  </div>
);

const UpcomingCard: React.FC<{ booking: Booking; tour?: Tour; onRequestCancel: (booking: Booking) => void }> = ({ booking, tour, onRequestCancel }) => {
  const cd = useCountdown(booking.departureDate);
  const cancelled = booking.status === 'cancelled';
  return (
    <div className={`overflow-hidden rounded-2xl border shadow-soft ${cancelled ? 'border-slate-200 opacity-70' : 'border-slate-100'}`}>
      <div className={`relative p-5 text-white ${cancelled ? 'bg-slate-400' : 'bg-gradient-to-br from-primary-600 to-primary-500'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-white/80">Mã booking {booking.bookingCode}</p>
            <h3 className="font-heading text-lg font-bold">{tour?.name ?? 'Chuyến đi'}</h3>
            <p className="text-xs text-white/80">Khởi hành {formatDateLong(booking.departureDate)}</p>
          </div>
          {tour && <img src={tour.coverImage} alt={tour.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
        </div>
        <div className="mt-4 flex gap-2">
          {cancelled ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">❌ Đã hủy tour</span>
          ) : cd.expired ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Chúc bạn lên đường vui vẻ! 🎉</span>
          ) : (
            <>
              <CountdownBlock value={cd.days} label="Ngày" />
              <CountdownBlock value={cd.hours} label="Giờ" />
              <CountdownBlock value={cd.minutes} label="Phút" />
              <CountdownBlock value={cd.seconds} label="Giây" />
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 text-xs sm:grid-cols-4">
        <div><p className="text-slate-400">Điểm đón</p><p className="font-semibold text-slate-700">{booking.pickupLocation}</p></div>
        <div><p className="text-slate-400">Giờ đón</p><p className="font-semibold text-slate-700">{booking.pickupTime}</p></div>
        <div><p className="text-slate-400">Khách sạn</p><p className="font-semibold text-slate-700">{booking.hotelName}</p></div>
        <div><p className="text-slate-400">HDV / Hotline 24/7</p><p className="font-semibold text-slate-700">{booking.guideName} — {booking.guidePhone}</p></div>
      </div>
      {!cancelled && !cd.expired && (
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => onRequestCancel(booking)}
            className="w-full rounded-xl border border-red-200 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
          >
            Hủy tour & yêu cầu hoàn tiền
          </button>
        </div>
      )}
    </div>
  );
};

const CancelBookingModal: React.FC<{
  booking: Booking;
  tourName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}> = ({ booking, tourName, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = React.useState(false);
  const daysUntilDeparture = Math.floor((new Date(booking.departureDate).getTime() - Date.now()) / 86400000);
  const percent = refundPercentFor(daysUntilDeparture);
  const refundAmount = Math.round((booking.totalPrice * percent) / 100);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-scaleIn">
        <h3 className="text-lg font-bold text-slate-800">Hủy tour "{tourName}"?</h3>
        <p className="mt-1 text-sm text-slate-500">Mã booking {booking.bookingCode} · còn {Math.max(daysUntilDeparture, 0)} ngày tới ngày khởi hành.</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Mức hoàn tiền</span>
            <span className="font-bold text-slate-800">{percent}%</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">Số tiền hoàn dự kiến</span>
            <span className="font-bold text-primary">{formatVND(refundAmount)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Theo Chính sách hoàn hủy: ≥30 ngày hoàn 90%, 15–29 ngày hoàn 50%, 7–14 ngày hoàn 30%, dưới 7 ngày không hoàn tiền. Tiền hoàn sẽ được xử lý trong 7–14 ngày làm việc.</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyTripsDashboard: React.FC<MyTripsDashboardProps> = ({ bookings, tours, checklist, onToggleChecklist, onAddChecklistItem, onCancelBooking, aiPlans }) => {
  const [tab, setTab] = React.useState<'upcoming' | 'checklist' | 'past' | 'ai'>('upcoming');
  const [newItemLabel, setNewItemLabel] = React.useState('');
  const [newItemCategory, setNewItemCategory] = React.useState<ChecklistCategory>('Giấy tờ tùy thân');
  const [cancelTarget, setCancelTarget] = React.useState<Booking | null>(null);

  const now = Date.now();
  const isFuture = (b: Booking) => new Date(b.departureDate).getTime() >= now;
  const activeUpcoming = bookings.filter((b) => b.status !== 'cancelled' && isFuture(b)).sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  const cancelledUpcoming = bookings.filter((b) => b.status === 'cancelled' && isFuture(b)).sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  const upcoming = [...activeUpcoming, ...cancelledUpcoming];
  const past = bookings.filter((b) => b.status !== 'cancelled' && !isFuture(b));

  const tourFor = (id: string) => tours.find((t) => t.id === id);
  const checkedCount = checklist.filter((c) => c.checked).length;

  return (
    <div className="container-px mx-auto py-8">
      <h2 className="font-heading text-2xl font-bold text-slate-900">Chuyến đi của tôi</h2>
      <p className="mt-1 text-sm text-slate-500">Theo dõi hành trình sắp tới, chuẩn bị hành lý và xem lại các chuyến đã hoàn thành.</p>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 text-sm font-semibold no-scrollbar">
        {([
          ['upcoming', `Sắp tới (${activeUpcoming.length})`],
          ['checklist', `Hành lý (${checkedCount}/${checklist.length})`],
          ['past', `Đã hoàn thành (${past.length})`],
          ['ai', `Kế hoạch AI (${aiPlans.length})`],
        ] as [typeof tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-2 transition ${tab === key ? 'bg-primary text-white shadow' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'upcoming' &&
          (upcoming.length === 0 ? (
            <EmptyState icon="🧳" text="Chưa có chuyến đi sắp tới. Hãy khám phá và đặt tour ngay!" />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcoming.map((b) => (
                <UpcomingCard key={b.id} booking={b} tour={tourFor(b.tourId)} onRequestCancel={setCancelTarget} />
              ))}
            </div>
          ))}

        {tab === 'checklist' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-2xl border border-slate-100 p-4">
                <h4 className="mb-2 text-sm font-bold text-slate-800">{cat}</h4>
                <ul className="space-y-1.5">
                  {checklist
                    .filter((c) => c.category === cat)
                    .map((item) => (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
                          <input type="checkbox" checked={item.checked} onChange={() => onToggleChecklist(item.id)} className="h-4 w-4 accent-primary" />
                          <span className={`text-sm ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
                          {item.custom && <span className="ml-auto rounded bg-cream px-1.5 py-0.5 text-[9px] font-bold text-primary-700">Tự thêm</span>}
                        </label>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-primary/40 p-4">
              <h4 className="mb-2 text-sm font-bold text-slate-800">+ Thêm vật dụng cá nhân</h4>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as ChecklistCategory)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="VD: Sạc dự phòng, ô dù cá nhân..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    if (!newItemLabel.trim()) return;
                    onAddChecklistItem(newItemCategory, newItemLabel.trim());
                    setNewItemLabel('');
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'past' &&
          (past.length === 0 ? (
            <EmptyState icon="🗂️" text="Bạn chưa có chuyến đi nào đã hoàn thành." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((b) => {
                const t = tourFor(b.tourId);
                return (
                  <div key={b.id} className="overflow-hidden rounded-xl border border-slate-100">
                    {t && <img src={t.coverImage} alt={t.name} className="h-28 w-full object-cover grayscale" />}
                    <div className="p-3">
                      <p className="text-xs text-slate-400">{b.bookingCode} · {formatDateLong(b.departureDate)}</p>
                      <h4 className="text-sm font-bold text-slate-800">{t?.name ?? 'Chuyến đi'}</h4>
                      <p className="mt-1 text-xs font-semibold text-primary-700">{formatVND(b.totalPrice)} — Hóa đơn điện tử</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {tab === 'ai' &&
          (aiPlans.length === 0 ? (
            <EmptyState icon="✨" text="Chưa có kế hoạch AI nào được lưu. Thử dùng AI Smart Planner ngay!" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {aiPlans.map((p, idx) => (
                <div key={`${p.destination}-${p.days}-${idx}`} className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="font-heading text-sm font-bold text-slate-800">Lịch trình {p.days} ngày — {p.destination}</h4>
                  <p className="mt-1 text-xs text-slate-500">Dự toán: <span className="font-semibold text-primary-700">{formatVND(p.totalCost)}</span></p>
                  <p className="mt-1 text-xs text-slate-500">{p.bestTime}</p>
                </div>
              ))}
            </div>
          ))}
      </div>

      {cancelTarget && (
        <CancelBookingModal
          booking={cancelTarget}
          tourName={tourFor(cancelTarget.tourId)?.name ?? 'Chuyến đi'}
          onClose={() => setCancelTarget(null)}
          onConfirm={async () => {
            await onCancelBooking(cancelTarget.id);
            setCancelTarget(null);
          }}
        />
      )}
    </div>
  );
};

const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
    <div>
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 max-w-xs text-sm">{text}</p>
    </div>
  </div>
);

export default MyTripsDashboard;
