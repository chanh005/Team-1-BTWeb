import React from 'react';
import type { AddOnService, Booking, Departure, LiveDeparture, PaymentMethod, Tour } from '../types';
import { buildDepartures, formatDMY, formatMonthTab, formatPillDate, getChildPolicy, monthKeyOf, singleRoomPrice } from '../data/departures';
import { useLiveDepartures } from '../hooks/useLiveDepartures';
import { HOLD_SECONDS, commitSeats, holdSeats, releaseSeats } from '../services/seatInventory';
import { formatVND, generateBookingCode, uid } from '../utils/format';
import { PAYMENT_LABEL, printTicket } from '../utils/ticketPrint';
import SeatBadge from './SeatBadge';

interface BookingCheckoutModalProps {
  tour: Tour;
  /** Group ("mã đoàn") the visitor already picked on the tour page. Only used by tours with fixed departures. */
  initialDepartureId?: string;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
  defaultName?: string;
  defaultEmail?: string;
}

const ADD_ONS: AddOnService[] = [
  { id: 'insurance', label: 'Bảo hiểm du lịch cao cấp', description: 'Bảo hiểm tai nạn & chi phí y tế trong suốt hành trình', price: 150000, unit: 'guest' },
  { id: 'single-room', label: 'Phụ thu phòng đơn', description: 'Nghỉ riêng một phòng, không ghép chung', price: 0, unit: 'booking' },
  { id: 'special-meal', label: 'Suất ăn đặc biệt', description: 'Ăn chay, Halal hoặc theo dị ứng — ghi rõ ở phần ghi chú', price: 120000, unit: 'guest' },
  { id: 'vip-pickup', label: 'Đưa đón sân bay VIP', description: 'Xe riêng đời mới, tài xế chuyên nghiệp', price: 590000, unit: 'booking' },
  { id: 'private-guide', label: 'Hướng dẫn viên riêng', description: 'HDV phục vụ riêng cho đoàn của bạn', price: 1200000, unit: 'booking' },
  { id: 'flycam', label: 'Thuê Flycam / Quay phim', description: 'Lưu giữ khoảnh khắc từ trên cao', price: 850000, unit: 'booking' },
];

/** Phụ thu phòng đơn chỉ có ở tour qua đêm; giá tính theo giá tour. */
const addOnsFor = (tour: Tour): AddOnService[] => {
  const single = singleRoomPrice(tour);
  return ADD_ONS.flatMap((a) => (a.id !== 'single-room' ? [a] : single ? [{ ...a, price: single }] : []));
};

const GUIDE_NAMES = ['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 'Phạm Thu Trang'];

type Step = 'form' | 'payment' | 'ticket';

const STEPS: [Step, string][] = [
  ['form', 'Chọn dịch vụ'],
  ['payment', 'Thanh toán'],
  ['ticket', 'Nhận vé'],
];

type PaymentTab = 'bank' | 'card' | 'wallet';

const PAYMENT_TABS: { id: PaymentTab; label: string; hint: string; method: PaymentMethod }[] = [
  { id: 'bank', label: 'Chuyển khoản QR', hint: 'Mã VietQR', method: 'vietqr' },
  { id: 'card', label: 'Thẻ quốc tế', hint: 'Visa / Mastercard', method: 'card' },
  { id: 'wallet', label: 'Ví điện tử', hint: 'MoMo / VNPay', method: 'momo' },
];

const tabOf = (method: PaymentMethod): PaymentTab => (method === 'vietqr' ? 'bank' : method === 'card' ? 'card' : 'wallet');

const QR_INFO: Record<Exclude<PaymentMethod, 'card'>, { hint: string; bank: string; pill: string }> = {
  vietqr: { hint: 'Quét mã VietQR bằng app ngân hàng', bank: 'Vietcombank', pill: 'bg-primary-50 text-primary-700' },
  momo: { hint: 'Quét bằng ứng dụng MoMo', bank: 'Ví MoMo', pill: 'bg-pink-100 text-pink-600' },
  vnpay: { hint: 'Quét bằng VNPay QR hoặc app ngân hàng', bank: 'Ví VNPay', pill: 'bg-sky-100 text-sky-700' },
};

const ACCOUNT_NUMBER = '190368688888';

const inputClass = (invalid = false) =>
  `rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary ${invalid ? 'border-rose-300' : 'border-slate-200'}`;

const qrImg = (data: string, size = 220) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

/** "Điểm đón" / "Giờ đón" shown on the ticket, taken from the group's first leg when there is one. */
const pickupOf = (tour: Tour, departure: Departure | null): Pick<Booking, 'pickupTime' | 'pickupLocation'> => {
  const leg = departure?.legs[0];
  if (!leg) return { pickupTime: '06:30', pickupLocation: `Văn phòng GoReady — ${tour.departure}` };
  if (leg.kind === 'flight') return { pickupTime: leg.departTime, pickupLocation: `Sân bay ${leg.from} (${leg.fromCode}) — ${leg.operator} ${leg.code}` };
  if (leg.kind === 'local') return { pickupTime: leg.departTime, pickupLocation: `Điểm hẹn tại ${leg.from}` };
  return { pickupTime: leg.departTime, pickupLocation: `${leg.operator} — ${leg.from}` };
};

/** How the group gets there, e.g. "✈ Vietjet Air VJ770 · 08:05 → 09:55". */
const legSummary = (d: Departure) => {
  const leg = d.legs[0];
  if (leg.kind === 'flight') return `✈ ${leg.operator} ${leg.code} · ${leg.departTime} → ${leg.arriveTime}`;
  if (leg.kind === 'local') return `🚌 ${leg.operator} · xe đón lúc ${leg.departTime}`;
  return `🚌 ${leg.operator} · ${leg.departTime} → ${leg.arriveTime}`;
};

const HOLD_LOST_NOTICE = 'Không thể giữ chỗ cho suất này (hết thời gian giữ chỗ hoặc vừa hết vé). Bạn chưa bị trừ tiền — vui lòng chọn lại.';

const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({ tour, initialDepartureId = '', onClose, onConfirm, defaultName = '', defaultEmail = '' }) => {
  const [step, setStep] = React.useState<Step>('form');
  // Every tour runs on the same rolling group departures as on the tour page, each with maxSeats / availableSeats
  const baseDepartures = React.useMemo(() => buildDepartures(tour), [tour]);
  // Same groups with the backend's current seat counts and "someone is holding this" / "sold out" status
  const { departures, ready: seatsReady } = useLiveDepartures(baseDepartures);
  const [departureId, setDepartureId] = React.useState(() => {
    const open = (d: LiveDeparture) => d.status === 'available';
    return departures.find((d) => d.id === initialDepartureId && open(d))?.id ?? departures.find(open)?.id ?? '';
  });
  // The month tab being shown in the date list (starts on the month of the pre-selected group)
  const months = React.useMemo(() => Array.from(new Set(baseDepartures.map((d) => monthKeyOf(d.date)))), [baseDepartures]);
  const [month, setMonth] = React.useState(() => monthKeyOf((departures.find((d) => d.id === departureId) ?? departures[0])?.date ?? ''));
  const [freeDate, setFreeDate] = React.useState('');
  const departure =departures.find((d) => d.id === departureId) ?? null;
  const baseDeparture = baseDepartures.find((d) => d.id === departureId) ?? null;
  const departureDate = departure?.date ?? freeDate;
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [infants, setInfants] = React.useState(0);
  const [contactName, setContactName] = React.useState(defaultName);
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState(defaultEmail);
  const [note, setNote] = React.useState('');
  const [selectedAddOns, setSelectedAddOns] = React.useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('vietqr');
  const [holdExpiresAt, setHoldExpiresAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [notice, setNotice] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvc, setCardCvc] = React.useState('');
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [starting, setStarting] = React.useState(false); // waiting for the backend to lock the group
  // Group this visitor currently holds; released when they go back, close the modal, or run out of time
  const heldIdRef = React.useRef<string | null>(null);
  const payTimerRef = React.useRef<number | null>(null);
  const unmountedRef = React.useRef(false);

  /** Gives the held group back (fire and forget: the hold expires on its own if the call fails). */
  const dropHold = () => {
    if (heldIdRef.current) releaseSeats(heldIdRef.current).catch(() => {});
    heldIdRef.current = null;
    setHoldExpiresAt(null);
  };

  React.useEffect(() => {
    unmountedRef.current = false;
    document.body.style.overflow = 'hidden';
    return () => {
      unmountedRef.current = true;
      document.body.style.overflow = '';
      if (payTimerRef.current !== null) window.clearTimeout(payTimerRef.current);
      if (heldIdRef.current) releaseSeats(heldIdRef.current).catch(() => {});
    };
  }, []);

  // Once the real seat counts arrive, move off a default pick that turned out to be held by someone else / sold out
  React.useEffect(() => {
    if (!seatsReady || step !== 'form') return;
    if (departures.find((d) => d.id === departureId)?.status === 'available') return;
    const open = departures.find((d) => d.status === 'available');
    setDepartureId(open?.id ?? '');
    if (open) setMonth(monthKeyOf(open.date));
  }, [seatsReady]);

  // Tick once a second while the hold countdown is on screen
  React.useEffect(() => {
    if (step !== 'payment' || holdExpiresAt === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [step, holdExpiresAt]);

  const remaining = holdExpiresAt === null ? 0 : Math.max(0, Math.ceil((holdExpiresAt - now) / 1000));

  // Out of time: give the seats back and send the visitor to the start
  React.useEffect(() => {
    if (step !== 'payment' || holdExpiresAt === null || remaining > 0 || processing) return;
    dropHold();
    setStep('form');
    setNotice('Thời gian giữ chỗ đã hết nên chỗ của bạn đã được nhả. Vui lòng chọn lại để tiếp tục.');
  }, [step, holdExpiresAt, remaining, processing]);

  const adultPrice = tour.discountPrice ?? tour.price;
  // Sheet tours have no child price when children are not accepted; built-in tours fall back to 70%
  const childPrice = tour.code ? tour.childPrice : tour.childPrice ?? Math.round(adultPrice * 0.7);
  const policy = tour.code ? getChildPolicy(tour) : null;
  const seatsLeft = departure?.availableSeats ?? Infinity;
  const guestSeats = adults + children; // infants do not take a seat
  const overSeats = guestSeats > seatsLeft;
  const unavailable = departure !== null && departure.status !== 'available';

  const availableAddOns = React.useMemo(() => addOnsFor(tour), [tour]);
  // Each add-on priced per guest (adults + children) or per booking, with the amount added to the total
  const addOnLines = availableAddOns
    .filter((a) => selectedAddOns.includes(a.id))
    .map((a) => {
      const quantity = a.unit === 'guest' ? guestSeats : 1;
      return { addOn: { ...a, quantity }, quantity, amount: a.price * quantity };
    });
  const addOnsTotal = addOnLines.reduce((sum, l) => sum + l.amount, 0);
  const subtotal = adults * adultPrice + children * (childPrice ?? 0);
  const total = subtotal + addOnsTotal;

  const guestRows = [
    { key: 'adult', label: 'Người lớn', value: adults, set: setAdults, min: 1, priceLabel: formatVND(adultPrice), takesSeat: true },
    ...(childPrice !== undefined
      ? [
          {
            key: 'child',
            label: policy ? (policy.childRange ? `Trẻ em (${policy.childRange})` : 'Trẻ em') : 'Trẻ em (2-11 tuổi)',
            value: children,
            set: setChildren,
            min: 0,
            priceLabel: formatVND(childPrice),
            takesSeat: true,
          },
        ]
      : []),
    ...(!policy || policy.freeRange
      ? [{ key: 'infant', label: policy ? `Trẻ nhỏ (${policy.freeRange})` : 'Em bé (dưới 2 tuổi)', value: infants, set: setInfants, min: 0, priceLabel: 'Miễn phí', takesSeat: false }]
      : []),
  ];

  const toggleAddOn = (id: string) => setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  const canContinue = Boolean(departureDate) && !overSeats && !unavailable;
  const phoneValid = /^[0-9+ ]{8,14}$/.test(contactPhone);
  const emailValid = /^\S+@\S+\.\S+$/.test(contactEmail);
  const contactValid = contactName.trim().length > 1 && phoneValid && emailValid;
  const cardValid = /^[0-9 ]{16,19}$/.test(cardNumber) && cardName.trim().length > 2 && /^\d{2}\/\d{2}$/.test(cardExpiry) && /^\d{3,4}$/.test(cardCvc);
  const canPay = !processing && contactValid && (paymentMethod !== 'card' || cardValid);

  /** Step 1 → 2. Entering payment locks the chosen group for HOLD_SECONDS so nobody else can buy it. */
  const goToPayment = async () => {
    if (starting) return;
    setNotice('');
    let expiresAt = Date.now() + HOLD_SECONDS * 1000;
    if (baseDeparture) {
      setStarting(true);
      try {
        const result = await holdSeats(baseDeparture, guestSeats);
        if (unmountedRef.current) {
          if (result.ok) releaseSeats(baseDeparture.id).catch(() => {});
          return;
        }
        if (!result.ok) {
          setNotice(
            result.reason === 'held'
              ? 'Suất khởi hành này vừa có người khác giữ chỗ. Vui lòng chọn suất khác hoặc thử lại sau ít phút.'
              : result.reason === 'sold-out'
                ? 'Suất khởi hành này vừa hết vé. Vui lòng chọn suất khác.'
                : 'Suất này không còn đủ chỗ cho số khách bạn chọn. Vui lòng giảm số khách hoặc chọn suất khác.',
          );
          return;
        }
        heldIdRef.current = baseDeparture.id;
        expiresAt = result.expiresAt;
      } catch {
        setNotice('Không thể kết nối máy chủ để giữ chỗ. Vui lòng kiểm tra backend rồi thử lại.');
        return;
      } finally {
        setStarting(false);
      }
    }
    setHoldExpiresAt(expiresAt);
    setNow(Date.now());
    setStep('payment');
  };

  const backToForm = () => {
    dropHold();
    setStep('form');
  };

  const handlePay = () => {
    if (!canPay) return;
    setProcessing(true);
    payTimerRef.current = window.setTimeout(async () => {
      payTimerRef.current = null;
      // Payment succeeded: turn the hold into a sale (deduct seats). Fails if the hold ran out meanwhile.
      let stillHeld = false;
      try {
        stillHeld = baseDeparture ? await commitSeats(baseDeparture, guestSeats) : holdExpiresAt !== null && Date.now() < holdExpiresAt;
      } catch {
        stillHeld = false;
      }
      if (unmountedRef.current) return;
      if (!stillHeld) {
        dropHold();
        setProcessing(false);
        setStep('form');
        setNotice(HOLD_LOST_NOTICE);
        return;
      }
      heldIdRef.current = null;
      const b: Booking = {
        id: uid('booking'),
        bookingCode: generateBookingCode(),
        tourId: tour.id,
        departureDate,
        departureCode: departure?.id,
        adults,
        children,
        infants,
        addOns: addOnLines.map((l) => l.addOn),
        contactName: contactName.trim(),
        contactPhone,
        contactEmail,
        note,
        totalPrice: total,
        paymentMethod,
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        guideName: GUIDE_NAMES[Math.floor(Math.random() * GUIDE_NAMES.length)],
        guidePhone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
        hotelName: tour.itinerary.find((d) => d.accommodation)?.accommodation ?? `Khách sạn ${tour.destination}`,
        ...pickupOf(tour, departure),
      };
      setBooking(b);
      onConfirm(b);
      setHoldExpiresAt(null);
      setProcessing(false);
      setStep('ticket');
    }, 1400);
  };

  const requestClose = () => {
    if (!processing) onClose();
  };

  const currentStepIndex = STEPS.findIndex(([id]) => id === step);
  const activeTab = tabOf(paymentMethod);
  const guestSummary = [`${adults} người lớn`, children > 0 && `${children} trẻ em`, infants > 0 && `${infants} em bé`].filter(Boolean).join(', ');
  const openDepartureCount = departures.filter((d) => d.status === 'available').length;
  const monthDepartures = departures.filter((d) => monthKeyOf(d.date) === month);

  return (
    // While seats are being held, only the ✕ button closes the modal so a stray click does not drop the reservation
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={step === 'payment' ? undefined : requestClose}>
      <div
        className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[88vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              {step === 'form' && 'Đặt tour'}
              {step === 'payment' && 'Xác nhận & thanh toán'}
              {step === 'ticket' && 'Đặt tour thành công'}
            </h3>
            <p className="line-clamp-1 text-xs text-slate-500">{tour.name}</p>
          </div>
          <button onClick={requestClose} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-500 hover:text-primary">
            ✕
          </button>
        </div>

        <ol className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold" aria-label="Các bước đặt tour">
          {STEPS.map(([id, label], i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <React.Fragment key={id}>
                {i > 0 && <li aria-hidden className={`h-px flex-1 ${done || active ? 'bg-primary/40' : 'bg-slate-200'}`} />}
                <li className={`flex items-center gap-1.5 ${active ? 'text-primary-700' : done ? 'text-emerald-600' : 'text-slate-400'}`} aria-current={active ? 'step' : undefined}>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                      active ? 'bg-primary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {label}
                </li>
              </React.Fragment>
            );
          })}
        </ol>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* STEP 1: CHỌN DỊCH VỤ */}
          {step === 'form' && (
            <div className="space-y-5">
              {notice && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <span aria-hidden>⚠️</span>
                  <span className="flex-1">{notice}</span>
                  <button onClick={() => setNotice('')} aria-label="Ẩn thông báo" className="text-rose-400 hover:text-rose-600">
                    ✕
                  </button>
                </div>
              )}

              {departures.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-800">Chọn ngày khởi hành</h4>
                    <span className="text-[11px] text-slate-400">{openDepartureCount > 0 ? `${openDepartureCount} ngày còn chỗ trong ${months.length} tháng tới` : 'Hiện không còn ngày nào để đặt'}</span>
                  </div>
                  <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto" role="tablist" aria-label="Tháng khởi hành">
                    {months.map((m) => {
                      const open = departures.filter((d) => monthKeyOf(d.date) === m && d.status === 'available').length;
                      const active = m === month;
                      return (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setMonth(m)}
                          className={`shrink-0 rounded-xl border px-3 py-1.5 text-left transition ${
                            active ? 'border-primary-700 bg-primary-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary'
                          }`}
                        >
                          <span className="block text-xs font-bold">{formatMonthTab(m)}</span>
                          <span className={`block text-[10px] ${active ? 'text-white/80' : open > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {open > 0 ? `${open} ngày còn chỗ` : 'Hết chỗ'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div key={month} className="max-h-72 space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label={`Ngày khởi hành ${formatMonthTab(month)}`}>
                    {monthDepartures.map((d) => {
                      const locked = d.status !== 'available';
                      const selected = d.id === departureId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={locked}
                          onClick={() => setDepartureId(d.id)}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${
                            locked
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                              : selected
                                ? 'border-primary bg-primary-50 ring-1 ring-primary'
                                : 'border-slate-200 hover:border-primary/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${locked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                              {formatPillDate(d.date)}
                              {d.date !== d.returnDate ? ` → ${formatDMY(d.returnDate)}` : ''}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Mã đoàn {d.id} · {legSummary(d)}
                            </p>
                          </div>
                          <SeatBadge departure={d} />
                        </button>
                      );
                    })}
                  </div>
                  {departure && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Đã chọn: <b className="text-slate-700">{formatPillDate(departure.date)}</b>
                      {departure.date !== departure.returnDate ? ` → ${formatDMY(departure.returnDate)}` : ''} · Mã đoàn {departure.id}
                    </p>
                  )}
                </div>
              ) : (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-800">Ngày khởi hành</span>
                  <input
                    type="date"
                    value={freeDate}
                    onChange={(e) => setFreeDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className={inputClass()}
                  />
                </label>
              )}

              <div className="rounded-xl border border-slate-100 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-800">Số lượng khách</h4>
                  {departure && Number.isFinite(seatsLeft) && (
                    <span className="text-[11px] text-slate-400">
                      Suất này còn {seatsLeft}/{departure.maxSeats} chỗ
                    </span>
                  )}
                </div>
                {guestRows.map(({ key, label, value, set, min, priceLabel, takesSeat }) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm text-slate-700">{label}</p>
                      <p className="text-[11px] text-slate-400">{priceLabel} / khách</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => set(Math.max(min, value - 1))}
                        disabled={value <= min}
                        aria-label={`Giảm ${label}`}
                        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm font-semibold">{value}</span>
                      <button
                        onClick={() => set(value + 1)}
                        disabled={takesSeat && guestSeats >= seatsLeft}
                        aria-label={`Tăng ${label}`}
                        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {overSeats && <p className="mt-2 text-xs font-semibold text-rose-500">Đoàn này chỉ còn {seatsLeft} chỗ. Vui lòng giảm số khách hoặc chọn đoàn khác.</p>}
                {unavailable && (
                  <p className="mt-2 text-xs font-semibold text-rose-500">
                    {departure?.status === 'holding' ? 'Suất này đang có người giữ chỗ. Vui lòng chọn suất khác hoặc quay lại sau ít phút.' : 'Suất này đã hết vé. Vui lòng chọn suất khác.'}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Dịch vụ đi kèm</h4>
                <div className="space-y-2">
                  {availableAddOns.map((a) => {
                    const checked = selectedAddOns.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition ${checked ? 'border-primary bg-primary-50/50' : 'border-slate-100 hover:border-primary/50'}`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleAddOn(a.id)} className="mt-1 accent-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{a.label}</p>
                          <p className="text-[11px] text-slate-400">{a.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary-700">
                            +{formatVND(a.price)}
                            <span className="font-medium text-slate-400"> / {a.unit === 'guest' ? 'khách' : 'booking'}</span>
                          </p>
                          {checked && a.unit === 'guest' && guestSeats > 1 && (
                            <p className="text-[11px] text-slate-500">
                              × {guestSeats} = {formatVND(a.price * guestSeats)}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Dịch vụ tính theo khách áp dụng cho người lớn và trẻ em. Tổng tiền được cộng dồn tự động.</p>
              </div>
            </div>
          )}

          {/* STEP 2: XÁC NHẬN & THANH TOÁN */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div
                role="timer"
                aria-live="off"
                className={`flex items-center gap-3 rounded-xl border p-3 ${remaining <= 60 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
              >
                <span className="text-xl" aria-hidden>
                  ⏳
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Chỗ của bạn được giữ trong <span className="font-heading text-base font-bold tabular-nums">{minutes}:{seconds}</span>
                  </p>
                  <p className="text-[11px] opacity-80">
                    {departure ? 'Suất khởi hành này đã được khóa cho bạn, khách khác chưa thể đặt. ' : ''}Hết giờ chỗ sẽ được nhả tự động.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Tóm tắt booking</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Tour</dt>
                    <dd className="text-right font-semibold text-slate-800">{tour.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Ngày đi</dt>
                    <dd className="text-right font-semibold text-slate-800">
                      {formatPillDate(departureDate)}
                      {departure && departure.date !== departure.returnDate ? ` → ${formatDMY(departure.returnDate)}` : ''}
                      {departure && <span className="block text-[11px] font-normal text-slate-400">Mã đoàn {departure.id}</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Số khách</dt>
                    <dd className="text-right font-semibold text-slate-800">{guestSummary}</dd>
                  </div>
                </dl>

                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">
                      Người lớn <span className="text-xs text-slate-400">({formatVND(adultPrice)} × {adults})</span>
                    </span>
                    <span className="font-semibold text-slate-800">{formatVND(adults * adultPrice)}</span>
                  </div>
                  {children > 0 && childPrice !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-600">
                        Trẻ em <span className="text-xs text-slate-400">({formatVND(childPrice)} × {children})</span>
                      </span>
                      <span className="font-semibold text-slate-800">{formatVND(children * childPrice)}</span>
                    </div>
                  )}
                  {addOnLines.length > 0 ? (
                    addOnLines.map(({ addOn, quantity, amount }) => (
                      <div key={addOn.id} className="flex justify-between gap-4">
                        <span className="text-slate-600">
                          {addOn.label} <span className="text-xs text-slate-400">({formatVND(addOn.price)} × {quantity})</span>
                        </span>
                        <span className="font-semibold text-slate-800">{formatVND(amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between gap-4 text-slate-400">
                      <span>Dịch vụ đi kèm</span>
                      <span>Không chọn</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between gap-4 border-t border-dashed border-slate-200 pt-3">
                  <span className="text-sm font-semibold text-slate-700">Tổng thanh toán</span>
                  <span className="font-heading text-2xl font-bold text-primary-700">{formatVND(total)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Thông tin liên hệ</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Họ và tên</span>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" className={inputClass()} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Số điện thoại</span>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="09xxxxxxxx"
                      autoComplete="tel"
                      className={inputClass(contactPhone !== '' && !phoneValid)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-500">Email nhận thông tin booking</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      autoComplete="email"
                      className={inputClass(contactEmail !== '' && !emailValid)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-500">Ghi chú đặc biệt (tùy chọn)</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`resize-none ${inputClass()}`} />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold text-slate-800">Phương thức thanh toán</h4>
                <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Phương thức thanh toán">
                  {PAYMENT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      onClick={() => activeTab !== tab.id && setPaymentMethod(tab.method)}
                      className={`rounded-xl border px-2 py-2.5 text-center transition ${
                        activeTab === tab.id ? 'border-primary bg-primary-50 text-primary-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-primary/50'
                      }`}
                    >
                      <span className="block text-xs font-bold">{tab.label}</span>
                      <span className="block text-[10px] opacity-70">{tab.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'wallet' && (
                <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                  {(['momo', 'vnpay'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${paymentMethod === method ? 'bg-white text-primary shadow' : 'text-slate-500'}`}
                    >
                      {method === 'momo' ? 'Ví MoMo' : 'Ví VNPay'}
                    </button>
                  ))}
                </div>
              )}

              {paymentMethod !== 'card' && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 p-5 text-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${QR_INFO[paymentMethod].pill}`}>{QR_INFO[paymentMethod].hint}</span>
                  <img
                    src={qrImg(`GOREADY|${tour.id}|${total}|${contactPhone || 'guest'}`)}
                    alt="QR thanh toán"
                    className="h-48 w-48 rounded-xl border border-slate-100"
                  />
                  <p className="font-heading text-lg font-bold text-primary-700">{formatVND(total)}</p>
                  <div className="w-full space-y-1.5 rounded-xl bg-slate-50 p-3 text-left text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Ngân hàng / ví thụ hưởng</span><span className="font-semibold">{QR_INFO[paymentMethod].bank}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Chủ tài khoản</span><span className="font-semibold">CTY TNHH GOREADY</span></div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tài khoản</span>
                      <span className="flex items-center gap-1.5 font-semibold">
                        1903 6868 8888
                        <button
                          onClick={() => navigator.clipboard?.writeText(ACCOUNT_NUMBER)}
                          className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700 hover:bg-primary-200"
                        >
                          Sao chép
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Nội dung</span><span className="font-semibold">GOREADY {contactPhone || 'XXXX'}</span></div>
                  </div>
                  <p className="text-xs text-slate-500">Sau khi chuyển khoản, bấm “Xác nhận thanh toán ngay” để hoàn tất đặt chỗ.</p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-3 rounded-2xl border border-slate-100 p-5">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Số thẻ Visa / Mastercard</span>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      className={inputClass()}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Tên chủ thẻ</span>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" autoComplete="cc-name" className={inputClass()} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">Ngày hết hạn</span>
                      <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, ''))} placeholder="MM/YY" maxLength={5} autoComplete="cc-exp" className={inputClass()} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">CVC/CVV</span>
                      <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123" maxLength={4} autoComplete="cc-csc" className={inputClass()} />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">🔒 Thông tin thẻ được mã hóa và bảo mật theo chuẩn PCI-DSS.</p>
                </div>
              )}

              {!contactValid && <p className="text-center text-xs text-slate-400">Vui lòng nhập đủ họ tên, số điện thoại và email hợp lệ để thanh toán.</p>}
            </div>
          )}

          {/* STEP 3: KẾT QUẢ & VÉ ĐIỆN TỬ */}
          {step === 'ticket' && booking && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center animate-fadeIn">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600" aria-hidden>
                  ✓
                </div>
                <h4 className="mt-3 font-heading text-xl font-bold text-slate-900">Thanh toán thành công!</h4>
                <p className="mt-1 text-sm text-slate-500">
                  {PAYMENT_LABEL[booking.paymentMethod]} · <b className="text-slate-700">{formatVND(booking.totalPrice)}</b>
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
                <span className="text-xl" aria-hidden>
                  📧
                </span>
                <div>
                  <p className="text-sm font-bold">Thông tin booking chi tiết đã được gửi đến email của quý khách</p>
                  <p className="mt-0.5 text-xs">{booking.contactEmail}</p>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary-50 to-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Mã Booking</p>
                    <p className="font-heading text-3xl font-bold tracking-wider text-primary-800">{booking.bookingCode}</p>
                  </div>
                  <img src={qrImg(booking.bookingCode, 90)} alt="QR check-in" className="h-20 w-20 rounded-lg border border-white bg-white p-1" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-slate-400">Hành trình</p><p className="font-semibold text-slate-800">{tour.name}</p></div>
                  <div><p className="text-slate-400">Khởi hành</p><p className="font-semibold text-slate-800">{new Date(booking.departureDate).toLocaleDateString('vi-VN')}{booking.departureCode ? ` · ${booking.departureCode}` : ''}</p></div>
                  <div><p className="text-slate-400">Số khách</p><p className="font-semibold text-slate-800">{booking.adults} người lớn, {booking.children} trẻ em, {booking.infants} em bé</p></div>
                  <div><p className="text-slate-400">Điểm đón</p><p className="font-semibold text-slate-800">{booking.pickupLocation} — {booking.pickupTime}</p></div>
                  <div><p className="text-slate-400">Khách sạn</p><p className="font-semibold text-slate-800">{booking.hotelName}</p></div>
                  <div><p className="text-slate-400">Hướng dẫn viên</p><p className="font-semibold text-slate-800">{booking.guideName} — {booking.guidePhone}</p></div>
                  {booking.addOns.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-slate-400">Dịch vụ đi kèm</p>
                      <p className="font-semibold text-slate-800">{booking.addOns.map((a) => `${a.label}${a.quantity && a.quantity > 1 ? ` × ${a.quantity}` : ''}`).join(' · ')}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-slate-400">Xem lại vé bất cứ lúc nào tại mục “Chuyến đi của tôi”.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          {step === 'form' && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-slate-500">Tổng tiền: </span>
                <span className="font-heading text-base font-bold text-primary-700">{formatVND(total)}</span>
                {addOnsTotal > 0 && <span className="block text-[11px] text-slate-400">gồm dịch vụ đi kèm {formatVND(addOnsTotal)}</span>}
              </div>
              <button
                onClick={goToPayment}
                disabled={!canContinue || starting}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {starting ? 'Đang giữ chỗ...' : 'Tiếp tục thanh toán'}
              </button>
            </div>
          )}
          {step === 'payment' && (
            <div className="flex items-center justify-between gap-3">
              <button onClick={backToForm} disabled={processing} className="text-sm font-semibold text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                ← Quay lại
              </button>
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? 'Đang xử lý...' : `Xác nhận thanh toán ngay · ${formatVND(total)}`}
              </button>
            </div>
          )}
          {step === 'ticket' && booking && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => printTicket(booking, tour)}
                className="flex-1 rounded-full border border-primary py-3 text-sm font-bold text-primary transition hover:bg-primary-50"
              >
                Tải vé điện tử / In vé
              </button>
              <button onClick={onClose} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-white shadow-card hover:bg-primary-600">
                Hoàn tất / Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutModal;
