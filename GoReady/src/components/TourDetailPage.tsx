import React from 'react';
import type { Departure, DepartureLeg, Tour } from '../types';
import { buildDepartures, formatDMY, formatMonthTab, formatPillDate, monthKeyOf } from '../data/departures';
import { discountPercent, formatVND } from '../utils/format';
import { onImageError } from '../utils/image';

interface TourDetailPageProps {
  tour: Tour;
  isSaved: boolean;
  onBack: () => void;
  onToggleSave: (tourId: string) => void;
  /** `departure` is the group the visitor picked, or null when the tour has no open departure. */
  onBook: (tour: Tour, departure: Departure | null) => void;
}

const SECTIONS = [
  ['info', 'Thông tin'],
  ['departure', 'Lịch khởi hành'],
  ['highlights', 'Điểm nổi bật'],
  ['itinerary', 'Lịch trình'],
  ['notes', 'Lưu ý'],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

const sectionDomId = (id: SectionId) => `tour-${id}`;

/** The group shown as "Đang chọn" by default: the soonest departure that still has seats. */
const firstOpen = (departures: Departure[]): Departure | undefined => departures.find((d) => d.seatsLeft > 0);

const monthOf = (d?: Departure): string => (d ? monthKeyOf(d.date) : '');

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

// ---------------------------------------------------------------------------
// Lịch khởi hành: mỗi đoàn có chuyến bay / xe riêng và bảng giá theo độ tuổi
// ---------------------------------------------------------------------------
const AIRLINE_STYLE: Record<string, string> = {
  VJ: 'text-red-600',
  VN: 'text-sky-700',
  VU: 'text-amber-600',
};

const LEG_ICON = { flight: '✈', limousine: '🚐', coach: '🚌', local: '🚌' } as const;

const seatLabel = (d: Departure) => (d.seatsLeft > 0 ? `Còn ${d.seatsLeft} chỗ` : 'Hết chỗ');

const LegBlock: React.FC<{ leg: DepartureLeg; className?: string }> = ({ leg, className = '' }) => {
  const isFlight = leg.kind === 'flight';
  const isLocal = leg.kind === 'local';

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          <span className="text-slate-500">{leg.label}: </span>
          <span className="font-semibold text-slate-800">{formatDMY(leg.date)}</span>
        </span>
        {isFlight ? (
          <span className="font-bold text-orange-500">✈ {leg.code}</span>
        ) : (
          <span className="text-right text-xs font-semibold text-slate-600">
            {LEG_ICON[leg.kind]} {leg.operator}
          </span>
        )}
      </div>

      {isLocal ? (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-heading text-lg font-bold text-slate-800">{leg.departTime}</span>
          <span className="ml-2 text-xs text-slate-400">{leg.label === 'Giờ đón' ? `Xe đón tại điểm hẹn ở ${leg.from}` : 'Kết thúc chương trình'}</span>
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between font-heading text-lg font-bold text-slate-800">
            <span>{leg.departTime}</span>
            <span>{leg.arriveTime}</span>
          </div>
          <div className="relative my-1.5 h-2" aria-hidden>
            <span className="absolute inset-x-1 top-1/2 border-t border-dotted border-slate-300" />
            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300" />
            <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300" />
          </div>
          <div className="flex justify-between gap-3 text-[11px] text-slate-500">
            <span>{leg.fromCode ? `${leg.from} (${leg.fromCode})` : leg.from}</span>
            <span className="text-right">{leg.toCode ? `${leg.to} (${leg.toCode})` : leg.to}</span>
          </div>
        </>
      )}

      {isFlight && <div className={`mt-3 font-heading text-sm font-bold italic ${AIRLINE_STYLE[leg.code?.slice(0, 2) ?? ''] ?? 'text-slate-700'}`}>{leg.operator}</div>}
    </div>
  );
};

const PriceRow: React.FC<{ name: string; note?: string; children: React.ReactNode }> = ({ name, note, children }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <div>
      <div className="font-heading text-sm font-bold text-slate-900">{name}</div>
      {note && <div className="text-[11px] text-slate-500">({note})</div>}
    </div>
    <div className="shrink-0 text-right font-heading text-sm font-bold text-red-600">{children}</div>
  </div>
);

const DepartureCard: React.FC<{ departure: Departure; selected: boolean; onSelect: () => void }> = ({ departure: d, selected, onSelect }) => {
  const soldOut = d.seatsLeft === 0;
  const { prices } = d;
  const [outbound, inbound] = d.legs;
  const adultNote = prices.childRange.includes('tuổi') ? 'Từ 12 tuổi trở lên' : undefined;
  const isShort = d.date === d.returnDate;

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${selected ? 'border-primary shadow-card' : 'border-slate-200'} ${
        soldOut ? 'opacity-70' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-primary-700">{formatPillDate(d.date)}</span>
          <span className="text-xs font-semibold text-slate-600 sm:text-sm">🎫 {d.id}</span>
        </div>
        <button
          onClick={onSelect}
          disabled={soldOut || selected}
          aria-pressed={selected}
          className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
            selected
              ? 'bg-primary-700 text-white'
              : soldOut
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'border border-primary text-primary hover:bg-primary-50'
          }`}
        >
          {selected ? 'Đang chọn' : soldOut ? 'Hết chỗ' : 'Chọn'}
        </button>
      </div>

      {!selected && (
        <p className="mt-3 text-xs text-slate-500">
          {isShort ? `Trong ngày · ${outbound.departTime}` : `${formatDMY(d.date)} → ${formatDMY(d.returnDate)}`} · {LEG_ICON[d.kind]}{' '}
          {d.kind === 'flight' ? `${outbound.operator} ${outbound.code}` : outbound.operator} · <span className={d.seatsLeft <= 4 ? 'font-semibold text-rose-500' : ''}>{seatLabel(d)}</span>
        </p>
      )}

      {selected && (
        <>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-center text-sm font-bold text-slate-900">{d.kind === 'local' ? 'Giờ đón & kết thúc' : 'Phương tiện di chuyển'}</h4>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-slate-200">
              <LegBlock leg={outbound} className="sm:pr-6" />
              <LegBlock leg={inbound} className="sm:pl-6" />
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-center text-sm font-bold text-slate-900">Giá chuyến đi</h4>
            <div className="mt-2 grid gap-x-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
              <div className="sm:pr-6">
                <PriceRow name="Người lớn" note={adultNote}>
                  {formatVND(prices.adult)}
                </PriceRow>
                <PriceRow name="Trẻ em" note={prices.childRange || undefined}>
                  {prices.child ? formatVND(prices.child) : <span className="font-body text-xs font-normal text-slate-400">Không áp dụng</span>}
                </PriceRow>
              </div>
              <div className="sm:pl-6">
                {prices.freeRange && (
                  <PriceRow name="Trẻ nhỏ" note={prices.freeRange}>
                    Miễn phí
                  </PriceRow>
                )}
                {prices.singleRoom && (
                  <PriceRow name="Phụ thu phòng đơn">{formatVND(prices.singleRoom)}</PriceRow>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Lightbox: React.FC<{ images: string[]; index: number; alt: string; onIndex: (i: number) => void; onClose: () => void }> = ({
  images,
  index,
  alt,
  onIndex,
  onClose,
}) => {
  const step = React.useCallback((dir: 1 | -1) => onIndex((index + dir + images.length) % images.length), [index, images.length, onIndex]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25">
        ✕
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Ảnh trước"
            className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Ảnh sau"
            className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            ›
          </button>
        </>
      )}
      <img src={images[index]} alt={alt} onError={onImageError} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
      <div className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
        {index + 1} / {images.length}
      </div>
    </div>
  );
};

const SectionCard: React.FC<{ id: SectionId; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={sectionDomId(id)} className="scroll-mt-32 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
    <h2 className="font-heading text-xl font-bold text-slate-900">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const BulletList: React.FC<{ items: string[]; tone: 'good' | 'bad' }> = ({ items, tone }) => (
  <ul className="space-y-2 text-sm text-slate-600">
    {items.map((item) => (
      <li key={item} className="flex gap-2">
        <span className={tone === 'good' ? 'text-emerald-500' : 'text-rose-500'}>{tone === 'good' ? '✓' : '✕'}</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const TourDetailPage: React.FC<TourDetailPageProps> = ({ tour, isSaved, onBack, onToggleSave, onBook }) => {
  const [activeImage, setActiveImage] = React.useState(0);
  const [lightbox, setLightbox] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionId>('info');
  const departures = React.useMemo(() => buildDepartures(tour), [tour]);
  const [departureId, setDepartureId] = React.useState(() => firstOpen(departures)?.id ?? '');
  const [month, setMonth] = React.useState(() => monthOf(firstOpen(departures) ?? departures[0]));
  const [openDays, setOpenDays] = React.useState<Set<number>>(() => new Set(tour.itinerary.slice(0, 1).map((d) => d.day)));

  const images = React.useMemo(() => [tour.coverImage, ...tour.gallery], [tour]);
  const months = React.useMemo(() => Array.from(new Set(departures.map((d) => monthKeyOf(d.date)))), [departures]);
  const selected = departures.find((d) => d.id === departureId) ?? null;
  const price = tour.discountPrice ?? tour.price;
  const pct = discountPercent(tour.price, tour.discountPrice);
  const durationLabel = tour.durationLabel || `${tour.duration} ngày${tour.nights ? ` ${tour.nights} đêm` : ''}`;
  const allDaysOpen = tour.itinerary.length > 0 && openDays.size === tour.itinerary.length;

  // A different tour (e.g. via the URL) starts from a clean page
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setActiveImage(0);
    const open = firstOpen(departures);
    setDepartureId(open?.id ?? '');
    setMonth(monthOf(open ?? departures[0]));
    setActiveSection('info');
    setOpenDays(new Set(tour.itinerary.slice(0, 1).map((d) => d.day)));
  }, [tour.id]);

  // Highlight the nav tab of the section currently under the sticky bars
  React.useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        const first = SECTIONS.find(([id]) => visible.has(sectionDomId(id)));
        if (first) setActiveSection(first[0]);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(sectionDomId(id));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tour.id]);

  const goTo = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById(sectionDomId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleDay = (day: number) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const infoRows: [string, string][] = [
    ['🎫 Mã tour', selected?.id ?? tour.code ?? tour.id],
    ['📍 Khởi hành', selected?.departFrom ?? tour.departure],
    ['⏱ Thời gian', durationLabel],
    ['💺 Số chỗ còn', selected ? seatLabel(selected) : 'Chưa có lịch'],
  ];

  const facts: [string, string][] = [
    ['Điểm đến', tour.destination],
    ['Danh mục', tour.category ?? ''],
    ['Phương tiện', tour.transport],
    ['Khách sạn', tour.hotelStars > 0 ? `${tour.hotelStars} sao` : ''],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  const selectDeparture = (d: Departure) => {
    setDepartureId(d.id);
    setMonth(monthKeyOf(d.date));
  };

  const monthDepartures = departures.filter((d) => monthKeyOf(d.date) === month);
  const canBook = departures.length === 0 || (selected !== null && selected.seatsLeft > 0);

  const highlightChips = [
    tour.category,
    durationLabel,
    tour.transport,
    tour.hotelStars > 0 ? `Khách sạn ${tour.hotelStars} sao` : '',
    ...tour.highlights,
  ].filter(Boolean);

  return (
    <div className="bg-surface pb-24 lg:pb-12">
      {/* Sticky section nav (sits right under the site navbar) */}
      <div className="sticky top-16 z-30 border-b border-slate-100 bg-white shadow-soft">
        <nav className="container-px mx-auto flex gap-1 overflow-x-auto no-scrollbar" aria-label="Các phần của tour">
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => goTo(id)}
              aria-current={activeSection === id ? 'true' : undefined}
              className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                activeSection === id ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="container-px mx-auto pt-5">
        {/* Breadcrumb: Trang chủ → Khám phá Tour → Tour */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button onClick={onBack} className="font-semibold text-primary hover:underline">
            ← Quay lại
          </button>
          <span aria-hidden>|</span>
          <button onClick={onBack} className="hover:text-primary">Trang chủ</button>
          <span aria-hidden>›</span>
          <button onClick={onBack} className="hover:text-primary">Khám phá Tour</button>
          <span aria-hidden>›</span>
          <span className="line-clamp-1 font-medium text-slate-700">{tour.name}</span>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Title + gallery */}
          <div className="lg:col-start-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">{tour.name}</h1>
                {tour.rating > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-amber-500">★ {tour.rating.toFixed(1)}</span>
                    {tour.reviewCount > 0 && <span className="text-slate-400">({tour.reviewCount.toLocaleString('vi-VN')} đánh giá)</span>}
                  </div>
                )}
              </div>
              <button
                onClick={() => onToggleSave(tour.id)}
                aria-label={isSaved ? 'Bỏ lưu tour' : 'Lưu tour'}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition ${
                  isSaved ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary'
                }`}
              >
                {isSaved ? '♥' : '♡'}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
              <div className="relative aspect-[16/9] bg-slate-100 sm:aspect-[2/1]">
                <img key={images[activeImage]} src={images[activeImage]} alt={tour.name} onError={onImageError} className="h-full w-full object-cover" />
                <button
                  onClick={() => setLightbox(true)}
                  aria-label="Xem ảnh toàn màn hình"
                  className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-xl bg-white/95 text-slate-700 shadow transition hover:text-primary"
                >
                  <ExpandIcon />
                </button>
              </div>
              {images.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto p-3 no-scrollbar">
                  {images.map((img, i) => (
                    <button
                      key={img + i}
                      onClick={() => setActiveImage(i)}
                      aria-label={`Xem ảnh ${i + 1}`}
                      className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        activeImage === i ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" onError={onImageError} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Booking sidebar */}
          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft lg:sticky lg:top-36">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Giá từ</div>
                  {pct > 0 && <div className="text-xs text-slate-400 line-through">{formatVND(tour.price)}</div>}
                  <div className="font-heading text-2xl font-bold text-primary-700">{formatVND(price)}</div>
                  <div className="text-[11px] text-slate-400">/ người lớn</div>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={() => goTo('departure')}
                    aria-label="Đổi đoàn khởi hành"
                    className="flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
                  >
                    <span>{formatPillDate(selected.date)}</span>
                    <PencilIcon />
                  </button>
                )}
              </div>

              <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
                {infoRows.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-slate-600">{label}</dt>
                    <dd className="text-right font-semibold text-primary-700">{value}</dd>
                  </div>
                ))}
              </dl>

              <button
                onClick={() => onBook(tour, selected)}
                disabled={!canBook}
                className="mt-4 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {canBook ? 'Đặt ngay' : 'Đã hết chỗ'}
              </button>
            </div>
          </aside>

          {/* Content sections */}
          <div className="space-y-6 lg:col-start-1">
            <SectionCard id="info" title="Thông tin">
              {tour.description && <p className="text-sm leading-relaxed text-slate-600">{tour.description}</p>}
              {facts.length > 0 && (
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-semibold text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {tour.includes.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-sm font-bold text-emerald-700">Giá tour bao gồm</h3>
                  <BulletList items={tour.includes} tone="good" />
                </div>
              )}
            </SectionCard>

            <SectionCard id="departure" title="Lịch khởi hành">
              {departures.length === 0 ? (
                <p className="text-sm text-slate-500">Hiện chưa có đoàn khởi hành. Vui lòng liên hệ GoReady để được tư vấn lịch riêng.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500">
                    Các đoàn khởi hành cố định do GoReady tổ chức. Chọn đoàn phù hợp để xem chuyến bay/xe di chuyển và bảng giá.
                  </p>
                  <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto" role="tablist" aria-label="Tháng khởi hành">
                    {months.map((m) => (
                      <button
                        key={m}
                        role="tab"
                        aria-selected={month === m}
                        onClick={() => setMonth(m)}
                        className={`shrink-0 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                          month === m ? 'border-primary-700 bg-primary-700 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {formatMonthTab(m)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 space-y-4">
                    {monthDepartures.map((d) => (
                      <DepartureCard key={d.id} departure={d} selected={d.id === departureId} onSelect={() => selectDeparture(d)} />
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[11px] text-slate-400">Tổng tiền được tính theo số lượng khách ở bước đặt tour.</p>
                </>
              )}
            </SectionCard>

            <SectionCard id="highlights" title="Điểm nổi bật">
              {tour.shortDescription && <p className="text-sm leading-relaxed text-slate-600">{tour.shortDescription}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {highlightChips.map((chip) => (
                  <span key={chip} className="rounded-lg bg-cream px-3 py-1.5 text-xs font-medium text-primary-800">
                    ✦ {chip}
                  </span>
                ))}
              </div>
            </SectionCard>

            <SectionCard id="itinerary" title="Lịch trình">
              {tour.itinerary.length === 0 ? (
                <p className="text-sm text-slate-500">Lịch trình chi tiết sẽ được GoReady gửi đến bạn khi xác nhận đặt tour.</p>
              ) : (
                <>
                  <div className="mb-3 flex justify-end">
                    <button
                      onClick={() => setOpenDays(allDaysOpen ? new Set() : new Set(tour.itinerary.map((d) => d.day)))}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {allDaysOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tour.itinerary.map((day) => {
                      const open = openDays.has(day.day);
                      return (
                        <div key={day.day} className="overflow-hidden rounded-xl border border-slate-100">
                          <button
                            onClick={() => toggleDay(day.day)}
                            aria-expanded={open}
                            className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{day.day}</span>
                            <span className="flex-1 font-heading text-sm font-bold text-slate-800">{day.title}</span>
                            {day.meals.length > 0 && <span className="hidden text-[11px] text-slate-500 sm:inline">🍴 {day.meals.join(', ')}</span>}
                            <span className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden>▾</span>
                          </button>
                          {open && (
                            <div className="p-4">
                              <ul className="space-y-2.5 border-l-2 border-accent/60 pl-4">
                                {day.activities.map((act, i) => (
                                  <li key={i} className="relative text-sm">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                    {act.time && <span className="mr-1.5 font-semibold text-primary-700">{act.time}</span>}
                                    <span className="font-medium text-slate-800">{act.title}</span>
                                    {act.description && <p className="text-xs text-slate-500">{act.description}</p>}
                                  </li>
                                ))}
                              </ul>
                              {(day.meals.length > 0 || day.accommodation) && (
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                  {day.meals.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1">🍴 Bữa ăn: {day.meals.join(', ')}</span>}
                                  {day.accommodation && <span className="rounded-full bg-slate-100 px-2.5 py-1">🛏️ {day.accommodation}</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard id="notes" title="Lưu ý">
              {tour.excludes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-rose-600">Giá tour không bao gồm</h3>
                  <BulletList items={tour.excludes} tone="bad" />
                </div>
              )}
              <div className={`rounded-xl bg-cream/60 p-4 text-sm text-primary-800 ${tour.excludes.length > 0 ? 'mt-5' : ''}`}>
                <span className="font-bold">Điều khoản & hoàn hủy: </span>
                {tour.cancellationPolicy}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Mobile booking bar (the sidebar is inline on small screens) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-slate-100 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
        <div>
          <div className="text-[11px] text-slate-500">Giá từ</div>
          <div className="font-heading text-lg font-bold leading-tight text-primary-700">{formatVND(price)}</div>
        </div>
        <button
          onClick={() => onBook(tour, selected)}
          disabled={!canBook}
          className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-card hover:bg-primary-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {canBook ? 'Đặt ngay' : 'Đã hết chỗ'}
        </button>
      </div>

      {lightbox && <Lightbox images={images} index={activeImage} alt={tour.name} onIndex={setActiveImage} onClose={() => setLightbox(false)} />}
    </div>
  );
};

export default TourDetailPage;
