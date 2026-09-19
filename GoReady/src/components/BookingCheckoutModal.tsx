import React from 'react';
import type { AddOnService, Booking, Departure, PaymentMethod, Tour } from '../types';
import { buildDepartures, formatDMY, formatPillDate, getChildPolicy } from '../data/departures';
import { formatVND, generateBookingCode, uid } from '../utils/format';

interface BookingCheckoutModalProps {
  tour: Tour;
  /** Group ("mã đoàn") the visitor already picked on the tour page. Only used by tours with fixed departures. */
  initialDepartureId?: string;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}

const ADD_ONS: AddOnService[] = [
  { id: 'vip-pickup', label: 'Đưa đón sân bay VIP', description: 'Xe riêng đời mới, tài xế chuyên nghiệp', price: 590000 },
  { id: 'private-guide', label: 'Hướng dẫn viên riêng', description: 'HDV phục vụ riêng cho đoàn của bạn', price: 1200000 },
  { id: 'flycam', label: 'Thuê Flycam / Quay phim', description: 'Lưu giữ khoảnh khắc từ trên cao', price: 850000 },
];

const GUIDE_NAMES = ['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 'Phạm Thu Trang'];

type Step = 'form' | 'payment' | 'ticket';

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

const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({ tour, initialDepartureId = '', onClose, onConfirm }) => {
  const [step, setStep] = React.useState<Step>('form');
  // Tours from "Gợi ý chuyến đi" run on fixed group departures; other tours let the visitor pick any date
  const departures = React.useMemo(() => (tour.code ? buildDepartures(tour) : []), [tour]);
  const [departureId, setDepartureId] = React.useState(
    () => (departures.some((d) => d.id === initialDepartureId && d.seatsLeft > 0) ? initialDepartureId : departures.find((d) => d.seatsLeft > 0)?.id ?? ''),
  );
  const [freeDate, setFreeDate] = React.useState('');
  const departure = departures.find((d) => d.id === departureId) ?? null;
  const departureDate = departure?.date ?? freeDate;
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [infants, setInfants] = React.useState(0);
  const [contactName, setContactName] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [note, setNote] = React.useState('');
  const [selectedAddOns, setSelectedAddOns] = React.useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('vietqr');
  const [countdown, setCountdown] = React.useState(900); // 15 min
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvc, setCardCvc] = React.useState('');
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  React.useEffect(() => {
    if (step !== 'payment' || paymentMethod === 'card') return;
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [step, paymentMethod, countdown]);

  const adultPrice = tour.discountPrice ?? tour.price;
  // Sheet tours have no child price when children are not accepted; built-in tours fall back to 70%
  const childPrice = tour.code ? tour.childPrice : tour.childPrice ?? Math.round(adultPrice * 0.7);
  const policy = tour.code ? getChildPolicy(tour) : null;
  const seatsLeft = departure?.seatsLeft ?? Infinity;
  const overSeats = adults + children > seatsLeft;
  const addOnsTotal = selectedAddOns.reduce((sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price ?? 0), 0);
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

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  const canSubmitForm = departureDate && !overSeats && contactName.trim() && /^[0-9+ ]{8,14}$/.test(contactPhone) && /^\S+@\S+\.\S+$/.test(contactEmail);
  const cardValid = /^[0-9 ]{16,19}$/.test(cardNumber) && cardName.trim().length > 2 && /^\d{2}\/\d{2}$/.test(cardExpiry) && /^\d{3,4}$/.test(cardCvc);

  const handlePay = () => {
    setProcessing(true);
    window.setTimeout(() => {
      const b: Booking = {
        id: uid('booking'),
        bookingCode: generateBookingCode(),
        tourId: tour.id,
        departureDate,
        departureCode: departure?.id,
        adults,
        children,
        infants,
        addOns: ADD_ONS.filter((a) => selectedAddOns.includes(a.id)),
        contactName,
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
      setProcessing(false);
      setStep('ticket');
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[88vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">
              {step === 'form' && 'Đặt tour'}
              {step === 'payment' && 'Thanh toán'}
              {step === 'ticket' && 'Vé điện tử của bạn'}
            </h3>
            <p className="line-clamp-1 text-xs text-slate-500">{tour.name}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-500 hover:text-primary">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* STEP 1: FORM */}
          {step === 'form' && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {departures.length > 0 ? (
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-500">Đoàn khởi hành</span>
                    <select
                      value={departureId}
                      onChange={(e) => setDepartureId(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                    >
                      {departures.map((d) => (
                        <option key={d.id} value={d.id} disabled={d.seatsLeft === 0}>
                          {formatPillDate(d.date)}
                          {d.date !== d.returnDate ? ` → ${formatDMY(d.returnDate)}` : ''} · {d.seatsLeft > 0 ? `còn ${d.seatsLeft} chỗ` : 'hết chỗ'}
                        </option>
                      ))}
                    </select>
                    {departure && (
                      <span className="text-[11px] text-slate-500">
                        Mã đoàn {departure.id} · {legSummary(departure)}
                      </span>
                    )}
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-500">Ngày khởi hành</span>
                    <input
                      type="date"
                      value={freeDate}
                      onChange={(e) => setFreeDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </label>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Số lượng khách</h4>
                {guestRows.map(({ key, label, value, set, min, priceLabel, takesSeat }) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm text-slate-700">{label}</p>
                      <p className="text-[11px] text-slate-400">{priceLabel} / khách</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => set(Math.max(min, value - 1))}
                        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-sm hover:border-primary"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm font-semibold">{value}</span>
                      <button
                        onClick={() => set(value + 1)}
                        disabled={takesSeat && adults + children >= seatsLeft}
                        className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                {overSeats && <p className="mt-2 text-xs font-semibold text-rose-500">Đoàn này chỉ còn {seatsLeft} chỗ. Vui lòng giảm số khách hoặc chọn đoàn khác.</p>}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">Dịch vụ gia tăng</h4>
                <div className="space-y-2">
                  {ADD_ONS.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-2.5 hover:border-primary/50">
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(a.id)}
                        onChange={() => toggleAddOn(a.id)}
                        className="mt-1 accent-primary"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{a.label}</p>
                        <p className="text-[11px] text-slate-400">{a.description}</p>
                      </div>
                      <span className="text-xs font-bold text-primary-700">+{formatVND(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Họ và tên</span>
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Số điện thoại</span>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="09xxxxxxxx" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-500">Email</span>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-500">Ghi chú đặc biệt (tùy chọn)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                {([
                  ['vietqr', 'VietQR'],
                  ['momo', 'Ví MoMo'],
                  ['card', 'Thẻ quốc tế'],
                ] as [PaymentMethod, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                      paymentMethod === key ? 'bg-white text-primary shadow' : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {(paymentMethod === 'vietqr' || paymentMethod === 'momo') && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 p-5 text-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentMethod === 'momo' ? 'bg-pink-100 text-pink-600' : 'bg-primary-50 text-primary-700'}`}>
                    {paymentMethod === 'momo' ? 'Quét bằng ứng dụng MoMo' : 'Quét mã VietQR bằng app ngân hàng'}
                  </span>
                  <img
                    src={qrImg(`GOREADY|${tour.id}|${total}|${contactPhone || 'guest'}`)}
                    alt="QR thanh toán"
                    className="h-48 w-48 rounded-xl border border-slate-100"
                  />
                  <p className="font-heading text-lg font-bold text-primary-700">{formatVND(total)}</p>
                  <div className="w-full space-y-1.5 rounded-xl bg-slate-50 p-3 text-left text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Ngân hàng thụ hưởng</span><span className="font-semibold">{paymentMethod === 'momo' ? 'Ví MoMo' : 'Vietcombank'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Chủ tài khoản</span><span className="font-semibold">CTY TNHH GOREADY</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Số tài khoản</span>
                      <span className="flex items-center gap-1.5 font-semibold">
                        1903 6868 8888
                        <button
                          onClick={() => navigator.clipboard?.writeText('1903686888888')}
                          className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700 hover:bg-primary-200"
                        >
                          Sao chép
                        </button>
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Nội dung</span><span className="font-semibold">GOREADY {contactPhone || 'XXXX'}</span></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mã giao dịch hết hạn sau <span className="font-bold text-rose-500">{minutes}:{seconds}</span>
                  </p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-3 rounded-2xl border border-slate-100 p-5">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Số thẻ</span>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Tên chủ thẻ</span>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">Ngày hết hạn</span>
                      <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, ''))} placeholder="MM/YY" maxLength={5} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-500">CVC/CVV</span>
                      <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123" maxLength={4} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">🔒 Thông tin thẻ được mã hóa và bảo mật theo chuẩn PCI-DSS.</p>
                </div>
              )}

              <div className="rounded-xl bg-cream/60 p-3.5 text-xs text-primary-800">
                Tổng thanh toán: <span className="font-bold">{formatVND(total)}</span> cho {adults + children + infants} khách — {tour.name}
              </div>
            </div>
          )}

          {/* STEP 3: E-TICKET */}
          {step === 'ticket' && booking && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary-50 to-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Mã Booking</p>
                    <p className="font-heading text-2xl font-bold text-primary-800">{booking.bookingCode}</p>
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
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-700">
                ✅ Thanh toán thành công qua {booking.paymentMethod === 'vietqr' ? 'VietQR' : booking.paymentMethod === 'momo' ? 'Ví MoMo' : 'Thẻ quốc tế'}. Tổng tiền: <b>{formatVND(booking.totalPrice)}</b>
              </div>
              <p className="text-center text-xs text-slate-400">Vé điện tử đã được gửi tới {booking.contactEmail}. Xem lại bất cứ lúc nào tại mục "Chuyến đi của tôi".</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          {step === 'form' && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-slate-500">Tổng tiền: </span>
                <span className="font-heading text-base font-bold text-primary-700">{formatVND(total)}</span>
              </div>
              <button
                onClick={() => setStep('payment')}
                disabled={!canSubmitForm}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp tục thanh toán
              </button>
            </div>
          )}
          {step === 'payment' && (
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setStep('form')} className="text-sm font-semibold text-slate-500 hover:text-primary">
                ← Quay lại
              </button>
              <button
                onClick={handlePay}
                disabled={processing || (paymentMethod === 'card' && !cardValid)}
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? 'Đang xử lý...' : `Xác nhận thanh toán ${formatVND(total)}`}
              </button>
            </div>
          )}
          {step === 'ticket' && (
            <button onClick={onClose} className="w-full rounded-full bg-primary py-3 text-sm font-bold text-white shadow-card hover:bg-primary-600">
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutModal;
