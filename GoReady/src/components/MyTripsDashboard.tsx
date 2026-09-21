import React from 'react';
import type { AiPlannerResult, Booking, ChecklistCategory, ChecklistItem, Tour } from '../types';
import { formatVND } from '../utils/format';
import TripCard from './my-trips/TripCard';
import TripDetail from './my-trips/TripDetail';
import { useTrips } from './my-trips/useTrips';
import { departureMoment, tripPhase } from './my-trips/tripUtils';
import type { ChuyenDi } from './my-trips/types';

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
  const [selectedTripId, setSelectedTripId] = React.useState<string | null>(null);

  // Trips (ChuyenDi) exist only for orders whose payment succeeded; unpaid orders never reach this list.
  const { trips, loading, error, reload } = useTrips(bookings);

  // Re-evaluate upcoming / completed as time passes, without waiting for the next data refresh
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  // The live booking list is fresher than the trip snapshot (e.g. right after a cancellation)
  const entries = trips.map((trip) => {
    const status = bookings.find((b) => b.id === trip.maDon)?.status ?? trip.don.trangThai;
    return { trip, phase: tripPhase(trip, status, now) };
  });
  const byDeparture = (a: { trip: ChuyenDi }, b: { trip: ChuyenDi }) => departureMoment(a.trip).getTime() - departureMoment(b.trip).getTime();
  const activeUpcoming = entries.filter((e) => e.phase === 'upcoming' || e.phase === 'ongoing').sort(byDeparture);
  const cancelledUpcoming = entries.filter((e) => e.phase === 'cancelled' && new Date(`${e.trip.ngayKetThuc}T23:59:59`).getTime() >= now).sort(byDeparture);
  const upcoming = [...activeUpcoming, ...cancelledUpcoming];
  const past = entries.filter((e) => e.phase === 'completed').sort((a, b) => byDeparture(b, a));

  const tourFor = (id: string) => tours.find((t) => t.id === id);
  const coverFor = (trip: ChuyenDi) => tourFor(trip.don.tourId)?.coverImage;
  const checkedCount = checklist.filter((c) => c.checked).length;

  const selected = selectedTripId ? entries.find((e) => e.trip.maChuyenDi === selectedTripId) ?? null : null;
  const openTrip = (trip: ChuyenDi) => {
    setSelectedTripId(trip.maChuyenDi);
    window.scrollTo({ top: 0 });
  };
  const requestCancel = (trip: ChuyenDi) => {
    const booking = bookings.find((b) => b.id === trip.maDon);
    if (booking) setCancelTarget(booking);
  };

  const cancelModal = cancelTarget && (
    <CancelBookingModal
      booking={cancelTarget}
      tourName={trips.find((t) => t.maDon === cancelTarget.id)?.tenChuyenDi ?? tourFor(cancelTarget.tourId)?.name ?? 'Chuyến đi'}
      onClose={() => setCancelTarget(null)}
      onConfirm={async () => {
        await onCancelBooking(cancelTarget.id);
        setCancelTarget(null);
        void reload();
      }}
    />
  );

  if (selected) {
    return (
      <div className="container-px mx-auto py-8">
        <TripDetail
          trip={selected.trip}
          phase={selected.phase}
          coverFallback={coverFor(selected.trip)}
          onBack={() => setSelectedTripId(null)}
          onRequestCancel={requestCancel}
        />
        {cancelModal}
      </div>
    );
  }

  const tripsPlaceholder = (emptyIcon: string, emptyText: string) =>
    loading && trips.length === 0 ? (
      <EmptyState icon="⏳" text="Đang tải chuyến đi của bạn..." />
    ) : error && trips.length === 0 ? (
      <div className="grid place-items-center rounded-2xl border border-dashed border-red-200 py-16 text-center">
        <div>
          <p className="text-3xl">⚠️</p>
          <p className="mt-2 max-w-xs text-sm text-red-500">Không tải được chuyến đi: {error}</p>
          <button onClick={() => void reload()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-600">Thử lại</button>
        </div>
      </div>
    ) : (
      <EmptyState icon={emptyIcon} text={emptyText} />
    );

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

      {error && trips.length > 0 && <p className="mt-3 text-xs text-red-500">Không cập nhật được chuyến đi mới nhất ({error}). Đang hiển thị dữ liệu đã tải trước đó.</p>}

      <div className="mt-6">
        {tab === 'upcoming' &&
          (upcoming.length === 0 ? (
            tripsPlaceholder('🧳', 'Chưa có chuyến đi sắp tới. Hãy khám phá và đặt tour ngay!')
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcoming.map(({ trip, phase }) => (
                <TripCard key={trip.maChuyenDi} trip={trip} phase={phase} coverFallback={coverFor(trip)} onOpen={openTrip} onRequestCancel={requestCancel} />
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
            tripsPlaceholder('🗂️', 'Bạn chưa có chuyến đi nào đã hoàn thành.')
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map(({ trip }) => {
                const cover = trip.anhBia || coverFor(trip);
                return (
                  <button
                    key={trip.maChuyenDi}
                    onClick={() => openTrip(trip)}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white text-left transition hover:shadow-card"
                  >
                    {cover && <img src={cover} alt={trip.tenChuyenDi} className="h-28 w-full object-cover grayscale" />}
                    <div className="p-3">
                      <p className="text-xs text-slate-400">{trip.don.bookingCode} · {new Date(`${trip.ngayKhoiHanh}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      <h4 className="text-sm font-bold text-slate-800">{trip.tenChuyenDi}</h4>
                      <p className="mt-1 text-xs font-semibold text-primary-700">{formatVND(trip.don.tongTien)} — Xem lại hành trình & vé</p>
                    </div>
                  </button>
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

      {cancelModal}
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
