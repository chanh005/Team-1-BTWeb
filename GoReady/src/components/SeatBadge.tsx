import React from 'react';
import type { LiveDeparture } from '../types';
import { LOW_SEATS } from '../utils/seats';

/** Nhãn số chỗ của một ngày khởi hành: "Còn N chỗ" / "Chỉ còn N chỗ", "Hết chỗ" (đang có người giữ) hoặc "Đã hết vé". */
const SeatBadge: React.FC<{ departure: LiveDeparture; className?: string }> = ({ departure: d, className = '' }) => {
  const base = `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${className}`;
  const title = `Sức chứa tối đa ${d.maxSeats} chỗ`;

  if (d.status === 'sold-out') {
    return (
      <span className={`${base} bg-rose-100 text-rose-600`} title={title}>
        Đã hết vé
      </span>
    );
  }
  if (d.status === 'holding') {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`} title="Đang có người giữ chỗ, có thể mở lại sau ít phút">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
        Hết chỗ · đang có người giữ chỗ
      </span>
    );
  }
  if (d.heldByMe) {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`} title={title}>
        Bạn đang giữ chỗ · còn {d.availableSeats} chỗ
      </span>
    );
  }
  const low = d.availableSeats <= LOW_SEATS;
  return (
    <span className={`${base} ${low ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-700'}`} title={title}>
      {low ? 'Chỉ còn' : 'Còn'} {d.availableSeats} chỗ
    </span>
  );
};

export default SeatBadge;
