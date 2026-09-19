import React from 'react';
import type { Tour } from '../types';
import type { SuggestedToursStatus } from '../hooks/useSuggestedTours';
import { tourHref } from '../hooks/useTourRoute';
import { buildDepartures, formatPillDate } from '../data/departures';
import { formatVND } from '../utils/format';
import { onImageError } from '../utils/image';

interface SuggestedToursProps {
  tours: Tour[];
  status: SuggestedToursStatus;
  onRetry: () => void;
  onOpenTour: (tour: Tour) => void;
}

const ALL = 'all';

const SuggestedTourCard: React.FC<{ tour: Tour; onOpen: (tour: Tour) => void }> = ({ tour, onOpen }) => {
  // Soonest group that still has seats
  const next = React.useMemo(() => buildDepartures(tour).find((d) => d.seatsLeft > 0), [tour]);

  return (
  <a
    href={tourHref(tour.id)}
    onClick={(e) => {
      // Let modified clicks (new tab/window) use the real link; plain clicks route in-app
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onOpen(tour);
    }}
    className="group flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card sm:w-[280px]"
  >
    <div className="relative h-40 overflow-hidden">
      <img
        src={tour.coverImage}
        alt={tour.name}
        loading="lazy"
        onError={onImageError}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
      />
      <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow">{tour.destination}</span>
        {tour.category && <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-primary-800 shadow">{tour.category}</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <span className="text-[11px] font-medium text-white/90">{tour.transport}</span>
      </div>
    </div>

    <div className="flex flex-1 flex-col gap-2 p-4">
      <h3 className="line-clamp-2 min-h-[2.5rem] font-heading text-sm font-bold text-slate-900 group-hover:text-primary">{tour.name}</h3>
      <p className="line-clamp-2 text-xs text-slate-500">{tour.shortDescription}</p>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{tour.durationLabel || `${tour.duration} ngày`}</span>
        {tour.rating > 0 ? (
          <span className="flex items-center gap-1 font-semibold text-amber-500" aria-label={`Đánh giá ${tour.rating.toFixed(1)} trên 5 sao`}>
            ★ {tour.rating.toFixed(1)}
            {tour.reviewCount > 0 && <span className="font-normal text-slate-400">({tour.reviewCount.toLocaleString('vi-VN')})</span>}
          </span>
        ) : (
          <span className="text-slate-400">Chưa có đánh giá</span>
        )}
      </div>

      {next && (
        <div className="text-[11px] text-slate-500">
          📅 <span className="font-semibold text-slate-700">{formatPillDate(next.date)}</span> · còn {next.seatsLeft} chỗ
        </div>
      )}

      <div className="mt-auto flex items-end justify-between pt-2">
        <div>
          <div className="font-heading text-base font-bold text-primary-700">{formatVND(tour.price)}</div>
          <div className="text-[10px] text-slate-400">
            người lớn{tour.childPrice ? ` · trẻ em ${formatVND(tour.childPrice)}` : ''}
          </div>
        </div>
        <span className="rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-card transition group-hover:bg-primary-600">
          Xem chi tiết
        </span>
      </div>
    </div>
  </a>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="w-[260px] shrink-0 animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white sm:w-[280px]">
    <div className="h-40 bg-slate-100" />
    <div className="space-y-2 p-4">
      <div className="h-4 w-3/4 rounded bg-slate-100" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-2/3 rounded bg-slate-100" />
      <div className="h-8 w-1/2 rounded bg-slate-100" />
    </div>
  </div>
);

const SuggestedTours: React.FC<SuggestedToursProps> = ({ tours, status, onRetry, onOpenTour }) => {
  const [destination, setDestination] = React.useState(ALL);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const destinations = React.useMemo(() => Array.from(new Set(tours.map((t) => t.destination))), [tours]);
  const visible = destination === ALL ? tours : tours.filter((t) => t.destination === destination);

  const selectDestination = (value: string) => {
    setDestination(value);
    sliderRef.current?.scrollTo({ left: 0 });
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = sliderRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Nothing to show and nothing went wrong: keep the home page clean
  if (status === 'ready' && tours.length === 0) return null;

  return (
    <section id="goi-y-chuyen-di" className="border-b border-slate-100 bg-white py-8">
      <div className="container-px mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Gợi ý chuyến đi</h2>
            <p className="mt-1 text-sm text-slate-500">Những hành trình được GoReady chọn lọc cho bạn</p>
          </div>
          {status === 'ready' && (
            <div className="hidden gap-2 sm:flex">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => scrollBy(dir)}
                  aria-label={dir === -1 ? 'Xem tour trước' : 'Xem tour tiếp theo'}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary"
                >
                  {dir === -1 ? '‹' : '›'}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'ready' && destinations.length > 1 && (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {[ALL, ...destinations].map((d) => (
              <button
                key={d}
                onClick={() => selectDestination(d)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  destination === d
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                }`}
              >
                {d === ALL ? 'Tất cả' : d}
              </button>
            ))}
          </div>
        )}

        {status === 'error' ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            <span>Không tải được danh sách gợi ý chuyến đi.</span>
            <button onClick={onRetry} className="rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50">
              Thử lại
            </button>
          </div>
        ) : (
          <div ref={sliderRef} className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [overflow-anchor:none]">
            {status === 'loading'
              ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)
              : visible.map((tour) => <SuggestedTourCard key={tour.id} tour={tour} onOpen={onOpenTour} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export default SuggestedTours;
