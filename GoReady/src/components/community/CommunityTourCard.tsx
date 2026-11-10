import React from 'react';
import type { Tour } from '../../types';
import { tourHref } from '../../hooks/useTourRoute';

interface CommunityTourCardProps {
  tour: Tour | null;
  onOpenTour?: (tourId: string) => void;
  variant?: 'sidebar' | 'inline';
}

export const CommunityTourCard: React.FC<CommunityTourCardProps> = ({
  tour,
  onOpenTour,
  variant = 'sidebar',
}) => {
  if (!tour) return null;

  const handleCtaClick = (e: React.MouseEvent) => {
    if (onOpenTour) {
      e.preventDefault();
      onOpenTour(tour.code || tour.id);
    }
  };

  const formattedPrice = (tour.discountPrice || tour.price).toLocaleString('vi-VN');
  const durationText = tour.durationLabel || `${tour.duration}N${tour.nights}Đ`;
  const ratingText = (tour.rating || 5).toFixed(1);
  const reviewsCount = tour.reviewCount || tour.reviews?.length || 0;

  if (variant === 'sidebar') {
    return (
      <aside className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
            <span>🎯</span> Tour được nhắc tới
          </span>
          <span className="text-xs font-medium text-slate-500">Mã: {tour.code || tour.id.slice(0, 6)}</span>
        </div>

        <div className="overflow-hidden rounded-xl bg-slate-100">
          <img
            src={tour.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'}
            alt={tour.name}
            className="aspect-[16/10] w-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>

        <div className="mt-4">
          <h4 className="font-heading text-base font-bold text-slate-900 line-clamp-2 hover:text-primary transition-colors">
            {tour.name}
          </h4>

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {durationText}
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <svg className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {ratingText} <span className="font-normal text-slate-400">({reviewsCount})</span>
            </span>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Giá niêm yết</span>
            <div className="text-right">
              {tour.discountPrice && (
                <div className="text-xs text-slate-400 line-through">
                  {tour.price.toLocaleString('vi-VN')} đ
                </div>
              )}
              <span className="font-heading text-lg font-bold text-primary">
                {formattedPrice} <span className="text-xs font-normal text-slate-600">đ/khách</span>
              </span>
            </div>
          </div>

          <a
            href={tourHref(tour.code || tour.id)}
            onClick={handleCtaClick}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold text-white shadow-soft transition-all hover:bg-primary-600 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            XEM CHI TIẾT & ĐẶT TOUR
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </aside>
    );
  }

  // Variant: inline (dành cho Mobile ở cuối bài, trước bình luận)
  return (
    <div className="my-8 rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50/60 to-white p-4 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-0.5 text-xs font-bold text-primary-800">
          <span>🎯</span> Tour được review trong bài
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{durationText}</span>
      </div>

      <div className="flex gap-3 sm:gap-4">
        <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-36">
          <img
            src={tour.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'}
            alt={tour.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h4 className="font-heading text-sm sm:text-base font-bold text-slate-900 line-clamp-2">
              {tour.name}
            </h4>
            <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-semibold">
              <svg className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {ratingText} <span className="font-normal text-slate-400">({reviewsCount} đánh giá)</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-heading text-base font-bold text-primary">
              {formattedPrice} <span className="text-[11px] font-normal text-slate-500">đ</span>
            </span>
            <a
              href={tourHref(tour.code || tour.id)}
              onClick={handleCtaClick}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-600"
            >
              ĐẶT TOUR
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityTourCard;

