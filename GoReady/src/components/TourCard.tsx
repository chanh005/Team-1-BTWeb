import React from 'react';
import type { Tour } from '../types';
import { discountPercent, formatVND } from '../utils/format';

interface TourCardProps {
  tour: Tour;
  isSaved: boolean;
  isComparing: boolean;
  compareDisabled: boolean;
  onOpenDetail: (tour: Tour) => void;
  onToggleSave: (tourId: string) => void;
  onToggleCompare: (tourId: string) => void;
}

const TourCard: React.FC<TourCardProps> = ({ tour, isSaved, isComparing, compareDisabled, onOpenDetail, onToggleSave, onToggleCompare }) => {
  const pct = discountPercent(tour.price, tour.discountPrice);
  const displayPrice = tour.discountPrice ?? tour.price;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card">
      <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => onOpenDetail(tour)}>
        <img
          src={tour.coverImage}
          alt={tour.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-col gap-1.5">
            {pct > 0 && (
              <span className="w-max rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-primary-800 shadow">-{pct}%</span>
            )}
            <span className="w-max rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow">
              {'★'.repeat(tour.hotelStars)} khách sạn
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(tour.id);
            }}
            aria-label="Lưu tour"
            className={`grid h-9 w-9 place-items-center rounded-full text-lg shadow transition ${
              isSaved ? 'bg-primary text-white' : 'bg-white/90 text-slate-500 hover:text-primary'
            }`}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <span className="text-[11px] font-medium text-white/90">{tour.transport}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <button onClick={() => onOpenDetail(tour)} className="text-left">
          <h3 className="font-heading text-base font-bold text-slate-900 line-clamp-1 group-hover:text-primary">{tour.name}</h3>
        </button>
        <p className="line-clamp-2 text-xs text-slate-500">{tour.shortDescription}</p>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-amber-500">★ {tour.rating.toFixed(1)}</span>
          <span>({tour.reviewCount} đánh giá)</span>
          <span className="ml-auto">{tour.bookingCount.toLocaleString('vi-VN')} đã đặt</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tour.styleTags.slice(0, 2).map((s) => (
            <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Khởi hành: {tour.departure}</span>
          <span className="font-semibold text-slate-700">{tour.duration}N{tour.nights}Đ</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {pct > 0 && <div className="text-xs text-slate-400 line-through">{formatVND(tour.price)}</div>}
            <div className="font-heading text-lg font-bold text-primary-700">{formatVND(displayPrice)}</div>
            <div className="text-[10px] text-slate-400">/ khách</div>
          </div>
          <button
            onClick={() => onOpenDetail(tour)}
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-card transition hover:bg-primary-600"
          >
            Xem chi tiết
          </button>
        </div>

        <button
          onClick={() => onToggleCompare(tour.id)}
          disabled={!isComparing && compareDisabled}
          className={`mt-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
            isComparing
              ? 'border-primary bg-primary-50 text-primary-700'
              : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40'
          }`}
        >
          {isComparing ? '✓ Đã thêm vào so sánh' : '+ Thêm vào so sánh'}
        </button>
      </div>
    </div>
  );
};

export default TourCard;
