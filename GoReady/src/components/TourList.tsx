import React from 'react';
import type { Tour } from '../types';
import TourCard from './TourCard';

interface TourListProps {
  tours: Tour[];
  savedIds: string[];
  compareIds: string[];
  onOpenDetail: (tour: Tour) => void;
  onToggleSave: (tourId: string) => void;
  onToggleCompare: (tourId: string) => void;
  /** Khi có, thông báo "không có tour" kèm nút xoá bộ lọc. */
  onClear?: () => void;
}

const TourList: React.FC<TourListProps> = ({ tours, savedIds, compareIds, onOpenDetail, onToggleSave, onToggleCompare, onClear }) => {
  if (tours.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 py-20 text-center text-slate-400">
        <div>
          <p className="text-3xl">🧭</p>
          <p className="mt-2 text-sm">Không tìm thấy tour phù hợp. Hãy thử điều chỉnh bộ lọc của bạn.</p>
          {onClear && (
            <button
              onClick={onClear}
              className="mt-4 rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tours.map((tour) => (
        <TourCard
          key={tour.id}
          tour={tour}
          isSaved={savedIds.includes(tour.id)}
          isComparing={compareIds.includes(tour.id)}
          compareDisabled={compareIds.length >= 3}
          onOpenDetail={onOpenDetail}
          onToggleSave={onToggleSave}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </div>
  );
};

export default TourList;
