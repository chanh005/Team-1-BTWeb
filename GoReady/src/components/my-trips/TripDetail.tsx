import React from 'react';
import { formatVND } from '../../utils/format';
import InteractiveMap from '../InteractiveMap';
import CountdownBlocks from './CountdownBlocks';
import { downloadTripIcs, downloadTripText, SUPPORT_HOTLINE } from './exportTrip';
import type { ChuyenDi, Ve } from './types';
import {
  departureMoment,
  destinationsOf,
  durationLabel,
  endOfProgram,
  fmtDate,
  fmtDateLong,
  fmtDateShort,
  groupByDay,
  mapDataOf,
  mapsUrl,
  paymentLabel,
  placeIcon,
  qrImageUrl,
  travelLegs,
  type Destination,
  type TripPhase,
} from './tripUtils';

interface TripDetailProps {
  trip: ChuyenDi;
  phase: TripPhase;
  coverFallback?: string;
  onBack: () => void;
  onRequestCancel?: (trip: ChuyenDi) => void;
}

const sectionDomId = (id: string) => `trip-section-${id}`;

const Section: React.FC<{ id: string; num: number; icon: string; title: string; hint?: string; children: React.ReactNode }> = ({ id, num, icon, title, hint, children }) => (
  <section id={sectionDomId(id)} className="scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2.5 font-heading text-base font-bold text-slate-900">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{num}</span>
        <span>
          <span className="mr-1.5">{icon}</span>
          {title}
        </span>
      </h3>
      {hint && <span className="shrink-0 text-xs text-slate-400">{hint}</span>}
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs text-slate-400">{label}</p>
    <div className="text-sm font-semibold text-slate-800">{children}</div>
  </div>
);

const SECTIONS = [
  { id: 'tour', label: 'Tour đã đặt' },
  { id: 'lich-trinh', label: 'Lịch trình' },
  { id: 'diem-den', label: 'Điểm đến' },
  { id: 've', label: 'Vé đã mua' },
  { id: 'khach-san', label: 'Khách sạn' },
  { id: 'di-chuyen', label: 'Di chuyển' },
];

const PHASE_BADGE: Record<TripPhase, { text: string; cls: string }> = {
  upcoming: { text: 'Sắp khởi hành', cls: 'bg-white/20' },
  ongoing: { text: '🚌 Đang diễn ra', cls: 'bg-white/20' },
  completed: { text: '✅ Đã hoàn thành', cls: 'bg-white/20' },
  cancelled: { text: '❌ Đã hủy', cls: 'bg-white/20' },
};

const DestinationGrid: React.FC<{ title: string; items: Destination[] }> = ({ title, items }) => (
  <div>
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map(({ place, days, activity, note }) => (
        <li key={place.maDiaDiem} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg shadow-soft">{placeIcon(place.loaiDiaDiem)}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug text-slate-800">{place.tenDiaDiem}</p>
            <p className="text-xs text-slate-500">{activity}</p>
            {note && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{note}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {days.map((d) => (
                <span key={d} className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">Ngày {d}</span>
              ))}
              <a href={mapsUrl(place)} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline">Bản đồ →</a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const TicketCard: React.FC<{ ve: Ve }> = ({ ve }) => {
  const [qrFailed, setQrFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const cancelled = ve.trangThai === 'da_huy';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ve.maDatVe);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context): the code is on screen anyway */
    }
  };

  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${cancelled ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-primary-100 bg-primary-50/40'}`}>
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-white bg-white p-1">
        {qrFailed ? (
          <span className="px-1 text-center text-[10px] text-slate-400">Không tải được mã QR — dùng mã đặt vé</span>
        ) : (
          <img src={qrImageUrl(ve.maQR, 160)} alt={`Mã QR vé ${ve.maDatVe}`} loading="lazy" onError={() => setQrFailed(true)} className={`h-full w-full ${cancelled ? 'grayscale' : ''}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-700">{ve.loaiVe}</span>
        <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">{ve.tenVe}</p>
        <p className="mt-1 text-xs text-slate-400">Mã đặt vé</p>
        <button onClick={copy} title="Sao chép mã" className="font-heading text-sm font-bold tracking-wide text-primary-800 hover:underline">
          {ve.maDatVe} <span className="text-[10px] font-normal text-slate-400">{copied ? '· đã chép' : '· chép'}</span>
        </button>
        <p className="mt-0.5 text-xs text-slate-500">
          {cancelled ? 'Vé đã hủy' : ve.giaVe === 0 ? 'Miễn phí' : ve.giaVe != null ? formatVND(ve.giaVe) : 'Đã bao gồm trong đơn'}
        </p>
      </div>
    </div>
  );
};

const TripDetail: React.FC<TripDetailProps> = ({ trip, phase, coverFallback, onBack, onRequestCancel }) => {
  const days = React.useMemo(() => groupByDay(trip.lichTrinh), [trip.lichTrinh]);
  const legs = React.useMemo(() => travelLegs(trip.lichTrinh), [trip.lichTrinh]);
  const { sights, food } = React.useMemo(() => destinationsOf(trip.lichTrinh), [trip.lichTrinh]);
  const mapData = React.useMemo(() => mapDataOf(trip.lichTrinh), [trip.lichTrinh]);
  const endRow = React.useMemo(() => endOfProgram(trip.lichTrinh), [trip.lichTrinh]);
  const pickupService = trip.ve.find((v) => v.loaiVe === 'Dịch vụ thêm' && /đưa đón|xe/i.test(v.tenVe));
  const cancelled = phase === 'cancelled';
  const cover = trip.anhBia || coverFallback;
  const [coverFailed, setCoverFailed] = React.useState(false);
  const guests = [
    trip.don.soNguoiLon > 0 && `${trip.don.soNguoiLon} người lớn`,
    trip.don.soTreEm > 0 && `${trip.don.soTreEm} trẻ em`,
    trip.don.soEmBe > 0 && `${trip.don.soEmBe} em bé`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">
        ← Quay lại danh sách chuyến đi
      </button>

      {/* Hero */}
      <div className={`relative overflow-hidden rounded-2xl text-white ${cancelled ? 'bg-slate-500' : 'bg-gradient-to-br from-primary-700 to-primary-500'}`}>
        {cover && !coverFailed && (
          <img src={cover} alt="" aria-hidden onError={() => setCoverFailed(true)} className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay" />
        )}
        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PHASE_BADGE[phase].cls}`}>{PHASE_BADGE[phase].text}</span>
            <h2 className="mt-3 font-heading text-2xl font-bold leading-snug sm:text-3xl">{trip.tenChuyenDi}</h2>
            <p className="mt-1 text-sm text-white/85">
              {fmtDate(trip.ngayKhoiHanh)} – {fmtDate(trip.ngayKetThuc)} · {durationLabel(trip)} · Mã đơn {trip.don.bookingCode}
            </p>
          </div>
          {phase === 'upcoming' && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">Đếm ngược đến giờ đón khách</p>
              <CountdownBlocks target={departureMoment(trip)} />
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Các mục của chuyến đi" className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SECTIONS.map((sec, i) => (
          <button
            key={sec.id}
            onClick={() => document.getElementById(sectionDomId(sec.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            {i + 1}. {sec.label}
          </button>
        ))}
      </nav>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* 1. Tour đã đặt */}
          <Section id="tour" num={1} icon="🎫" title="Tour đã đặt">
            {cover && !coverFailed && (
              <img src={cover} alt={trip.tenChuyenDi} onError={() => setCoverFailed(true)} className="mb-5 h-48 w-full rounded-xl object-cover sm:h-56" />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên chuyến đi">{trip.tenChuyenDi}</Field>
              <Field label="Mã đơn"><span className="font-heading tracking-wide text-primary-800">{trip.don.bookingCode}</span></Field>
              <Field label="Thời gian">
                {fmtDateLong(trip.ngayKhoiHanh)}
                {trip.ngayKetThuc !== trip.ngayKhoiHanh && <> → {fmtDateLong(trip.ngayKetThuc)}</>}
                <span className="block text-xs font-normal text-slate-500">{durationLabel(trip)}</span>
              </Field>
              <Field label="Số khách">{guests || '—'}</Field>
              <Field label="Tổng chi phí"><span className="text-primary-700">{formatVND(trip.don.tongTien)}</span></Field>
              <Field label="Thanh toán">
                {paymentLabel(trip.don.phuongThucThanhToan)}
                <span className="block text-xs font-normal text-slate-500">Đặt ngày {fmtDate(trip.don.ngayDat.slice(0, 10))}</span>
              </Field>
              <Field label="Người đặt">
                {trip.don.tenLienHe}
                <span className="block text-xs font-normal text-slate-500">{trip.don.sdtLienHe}</span>
              </Field>
              {trip.don.ghiChu && <Field label="Ghi chú">{trip.don.ghiChu}</Field>}
            </div>
          </Section>

          {/* 2. Lịch trình theo ngày / giờ */}
          <Section id="lich-trinh" num={2} icon="🗓️" title="Lịch trình theo ngày" hint={`${days.length} ngày · ${trip.lichTrinh.length} hoạt động`}>
            {days.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có lịch trình chi tiết cho chuyến đi này.</p>
            ) : (
              <div className="space-y-6">
                {days.map((day) => (
                  <div key={day.ngayThu}>
                    <p className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                      Ngày {day.ngayThu} · {fmtDateShort(day.ngay)}
                    </p>
                    <ol className="relative ml-2 space-y-4 border-l-2 border-primary-100 pl-5">
                      {day.rows.map((r) => (
                        <li key={r.maLichTrinh} className="relative">
                          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary ring-2 ring-primary-100" />
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-heading text-sm font-bold tabular-nums text-primary-700">{r.gio ?? '--:--'}</span>
                            <span className="text-sm font-semibold text-slate-800">{r.tieuDe}</span>
                          </div>
                          {r.moTa && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{r.moTa}</p>}
                          {r.diaDiem && (
                            <a
                              href={mapsUrl(r.diaDiem)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-primary-50 hover:text-primary-700"
                            >
                              {placeIcon(r.diaDiem.loaiDiaDiem)} {r.diaDiem.tenDiaDiem} <span className="text-slate-400">· Xem bản đồ</span>
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 3. Các điểm đến */}
          <Section id="diem-den" num={3} icon="📍" title="Các điểm đến" hint={`${sights.length} điểm tham quan${food.length ? ` · ${food.length} điểm ăn uống` : ''}`}>
            {sights.length === 0 && food.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có danh sách điểm đến chi tiết cho chuyến đi này.</p>
            ) : (
              <div className="space-y-5">
                {mapData.route.length > 0 && (
                  // isolate: keep the map's own z-indexes from painting over the site's sticky header
                  <div className="relative isolate">
                    <InteractiveMap route={mapData.route} itinerary={mapData.itinerary} />
                  </div>
                )}
                {sights.length > 0 && <DestinationGrid title="Điểm tham quan chính" items={sights} />}
                {food.length > 0 && <DestinationGrid title="Ẩm thực & nghỉ chân" items={food} />}
              </div>
            )}
          </Section>

          {/* 4. Vé đã mua */}
          <Section id="ve" num={4} icon="🎟️" title="Vé đã mua" hint={`${trip.ve.length} vé điện tử`}>
            {trip.ve.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có vé nào cho chuyến đi này.</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {trip.ve.map((v) => (
                    <TicketCard key={v.maVe} ve={v} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">Xuất trình mã QR hoặc mã đặt vé với hướng dẫn viên khi check-in.</p>
              </>
            )}
          </Section>

          {/* 5. Khách sạn & lưu trú */}
          <Section id="khach-san" num={5} icon="🏨" title="Khách sạn & lưu trú">
            {trip.khachSan ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-base font-bold text-slate-800">{trip.khachSan.tenKhachSan}</p>
                  {trip.khachSan.hangSao ? (
                    <p className="text-sm text-amber-500" aria-label={`${trip.khachSan.hangSao} sao`}>
                      {'★'.repeat(trip.khachSan.hangSao)}
                      <span className="text-slate-300">{'★'.repeat(Math.max(0, 5 - trip.khachSan.hangSao))}</span>
                    </p>
                  ) : null}
                  {trip.khachSan.diaChi && <p className="text-xs text-slate-500">📍 {trip.khachSan.diaChi}</p>}
                </div>
                <Field label="Nhận phòng">
                  {trip.ngayNhanPhong ? fmtDateLong(trip.ngayNhanPhong) : '—'}
                  <span className="block text-xs font-normal text-slate-500">Từ 14:00</span>
                </Field>
                <Field label="Trả phòng">
                  {trip.ngayTraPhong ? fmtDateLong(trip.ngayTraPhong) : '—'}
                  <span className="block text-xs font-normal text-slate-500">Trước 12:00 · {trip.soDem} đêm</span>
                </Field>
                <div className="sm:col-span-2">
                  <a
                    href={mapsUrl({ tenDiaDiem: `${trip.khachSan.tenKhachSan} ${trip.khachSan.diaChi ?? ''}`.trim(), viDo: trip.khachSan.viDo, kinhDo: trip.khachSan.kinhDo })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Xem khách sạn trên bản đồ →
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Đây là tour trong ngày nên không có lưu trú.</p>
            )}
          </Section>

          {/* 6. Thời gian di chuyển & logistics */}
          <Section id="di-chuyen" num={6} icon="🚌" title="Thời gian di chuyển & logistics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phương tiện">{trip.phuongTien ?? 'Theo chương trình tour'}</Field>
              <Field label="Dịch vụ đưa đón">{pickupService ? pickupService.tenVe : 'Đón tại điểm hẹn theo chương trình tour'}</Field>
              <Field label="Điểm đón">{trip.diemDon ?? '—'}</Field>
              <Field label="Giờ đón">{trip.gioDon ?? '—'} <span className="text-xs font-normal text-slate-500">(có mặt trước 15 phút)</span></Field>
              <Field label="Trả khách (dự kiến)">
                {endRow ? (
                  <>
                    {endRow.gio} · {fmtDateLong(endRow.ngay)}
                    <span className="block text-xs font-normal text-slate-500">Theo giờ kết thúc lịch trình — HDV sẽ xác nhận lại</span>
                  </>
                ) : (
                  'Theo chương trình tour'
                )}
              </Field>
              <Field label="Hướng dẫn viên">{trip.tenHDV ?? 'Sẽ được thông báo'}</Field>
              <Field label="Liên hệ HDV">
                {trip.sdtHDV ? (
                  <a href={`tel:${trip.sdtHDV.replace(/\s/g, '')}`} className="text-primary hover:underline">{trip.sdtHDV}</a>
                ) : (
                  '—'
                )}
              </Field>
            </div>
            {legs.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Các chặng di chuyển</p>
                <ul className="space-y-2">
                  {legs.map((r) => (
                    <li key={r.maLichTrinh} className="flex items-start gap-3 text-sm">
                      <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                        Ngày {r.ngayThu} · {r.gio ?? '--:--'}
                      </span>
                      <span className="text-slate-700">
                        {placeIcon(r.diaDiem?.loaiDiaDiem)} {r.tieuDe}
                        {r.diaDiem && <span className="text-slate-400"> — {r.diaDiem.tenDiaDiem}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        </div>

        {/* Utilities */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
            <h3 className="font-heading text-base font-bold text-slate-900">🧰 Tiện ích chuyến đi</h3>
            <div className="mt-3 space-y-2">
              <button onClick={() => downloadTripText(trip)} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-600">
                ⬇️ Tải thông tin hành trình
              </button>
              <button onClick={() => downloadTripIcs(trip)} className="w-full rounded-xl border border-primary-200 px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:bg-primary-50">
                📅 Thêm vào lịch (.ics)
              </button>
            </div>
            {!cancelled && phase === 'upcoming' && onRequestCancel && (
              <button
                onClick={() => onRequestCancel(trip)}
                className="mt-4 w-full rounded-xl border border-red-200 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
              >
                Hủy tour & yêu cầu hoàn tiền
              </button>
            )}
          </section>

          <section className="rounded-2xl bg-cream p-5">
            <h3 className="font-heading text-base font-bold text-slate-900">🛟 Hỗ trợ trong chuyến đi</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <span className="text-xs text-slate-500">Hotline GoReady 24/7</span>
                <br />
                <a href={`tel:${SUPPORT_HOTLINE.replace(/\s/g, '')}`} className="font-bold text-primary-800 hover:underline">{SUPPORT_HOTLINE}</a>
              </li>
              {trip.sdtHDV && (
                <li>
                  <span className="text-xs text-slate-500">Hướng dẫn viên {trip.tenHDV ?? ''}</span>
                  <br />
                  <a href={`tel:${trip.sdtHDV.replace(/\s/g, '')}`} className="font-bold text-primary-800 hover:underline">{trip.sdtHDV}</a>
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Khi liên hệ, hãy nêu mã đơn <b>{trip.don.bookingCode}</b> để được hỗ trợ nhanh nhất.</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TripDetail;
