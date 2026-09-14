import React from 'react';
import { formatThoiGian, formatVND } from '../../utils/format';
import { placeholderImage } from '../../utils/placeholderImage';

// ==========================================================================
// TourCard — thẻ hiển thị 1 tour, props đúng theo field CSDL (TenTour, Gia,
// ThoiGian, TenDiaDiem). TenDiaDiem được join sẵn từ DiaDiem qua MaDiaDiem
// trước khi truyền vào đây — component không tự join.
// ==========================================================================

export interface TourCardProps {
  MaTour: string;
  TenTour: string;
  Gia: number;
  ThoiGian: number;
  TenDiaDiem: string;
  /** Gọi khi bấm "Xem chi tiết"; mặc định không làm gì nếu chưa truyền. */
  onViewDetail?: (maTour: string) => void;
}

const TourCard: React.FC<TourCardProps> = ({ MaTour, TenTour, Gia, ThoiGian, TenDiaDiem, onViewDetail }) => (
  <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card">
    <div className="relative h-44 overflow-hidden">
      <img
        src={placeholderImage(MaTour)}
        alt={TenTour}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
      />
    </div>
    <div className="flex flex-1 flex-col gap-1.5 p-4">
      <h3 className="line-clamp-2 font-heading text-base font-bold text-slate-900">{TenTour}</h3>
      <p className="text-sm text-slate-500">{TenDiaDiem}</p>

      <div className="mt-auto flex items-center justify-between pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Giá từ</p>
          <p className="font-heading text-lg font-bold text-primary">{formatVND(Gia)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatThoiGian(ThoiGian)}</span>
      </div>

      <button
        type="button"
        onClick={() => onViewDetail?.(MaTour)}
        className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-600"
      >
        Xem chi tiết
      </button>
    </div>
  </div>
);

export default TourCard;
