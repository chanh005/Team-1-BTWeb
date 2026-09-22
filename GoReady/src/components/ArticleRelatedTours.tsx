import React from 'react';
import type { Tour } from '../types';
import { formatVND } from '../utils/format';
import { onImageError } from '../utils/image';

interface ArticleRelatedToursProps {
  /** `article.relatedTourIds` — admin chọn trong trang Quản lý Bảng tin. */
  tourIds: string[];
  tours: Tour[];
  /** Mở trang chi tiết tour, ví dụ `openTour` của useTourRoute trong App.tsx. */
  onOpenTour: (tourId: string) => void;
}

/** Thẻ "Tour gợi ý" đặt cuối bài viết Bảng tin; bỏ qua tour đã bị ẩn hoặc xoá. */
const ArticleRelatedTours: React.FC<ArticleRelatedToursProps> = ({ tourIds, tours, onOpenTour }) => {
  const related = tourIds
    .map((id) => tours.find((t) => t.id === id))
    .filter((t): t is Tour => Boolean(t && !t.hidden));
  if (related.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-bold text-slate-900">Tour gợi ý từ bài viết</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {related.map((t) => (
          <div key={t.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-soft">
            <img src={t.coverImage} alt={t.name} onError={onImageError} className="h-20 w-24 shrink-0 rounded-xl object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="line-clamp-2 text-sm font-semibold text-slate-800">{t.name}</p>
              <p className="text-xs text-slate-400">{t.destination}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-sm font-bold text-primary">{formatVND(t.discountPrice || t.price)}</span>
                <button
                  type="button"
                  onClick={() => onOpenTour(t.id)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600"
                >
                  Đặt ngay
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArticleRelatedTours;
