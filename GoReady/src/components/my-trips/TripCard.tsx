import React from 'react';
import type { ChuyenDi } from './types';
import { durationLabel, departureMoment, fmtDateLong, type TripPhase } from './tripUtils';
import CountdownBlocks from './CountdownBlocks';
import { formatVND } from '../../utils/format';

interface TripCardProps {
  trip: ChuyenDi;
  phase: TripPhase;
  coverFallback?: string;
  onOpen: (trip: ChuyenDi) => void;
  onRequestCancel?: (trip: ChuyenDi) => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, phase, coverFallback, onOpen, onRequestCancel }) => {
  const cancelled = phase === 'cancelled';
  const cover = trip.anhBia || coverFallback;
  const [coverFailed, setCoverFailed] = React.useState(false);

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-soft transition hover:shadow-card ${cancelled ? 'border-slate-200 opacity-70' : 'border-slate-100'}`}>
      <button type="button" onClick={() => onOpen(trip)} className="block w-full text-left" aria-label={`Xem chi tiết chuyến đi ${trip.tenChuyenDi}`}>
        <div className={`relative p-5 text-white ${cancelled ? 'bg-slate-400' : 'bg-gradient-to-br from-primary-600 to-primary-500'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/80">Mã đơn {trip.don.bookingCode}</p>
              <h3 className="font-heading text-lg font-bold leading-snug">{trip.tenChuyenDi}</h3>
              <p className="text-xs text-white/80">
                Khởi hành {fmtDateLong(trip.ngayKhoiHanh)} · {durationLabel(trip)}
              </p>
            </div>
            {cover && !coverFailed && (
              <img src={cover} alt={trip.tenChuyenDi} onError={() => setCoverFailed(true)} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {cancelled ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">❌ Đã hủy tour</span>
            ) : phase === 'ongoing' ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">🚌 Đang diễn ra</span>
            ) : (
              <CountdownBlocks target={departureMoment(trip)} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 text-xs sm:grid-cols-4">
          <div><p className="text-slate-400">Điểm đón</p><p className="font-semibold text-slate-700">{trip.diemDon ?? '—'}</p></div>
          <div><p className="text-slate-400">Giờ đón</p><p className="font-semibold text-slate-700">{trip.gioDon ?? '—'}</p></div>
          <div><p className="text-slate-400">Khách sạn</p><p className="font-semibold text-slate-700">{trip.khachSan?.tenKhachSan ?? 'Tour trong ngày'}</p></div>
          <div><p className="text-slate-400">Tổng chi phí</p><p className="font-semibold text-primary-700">{formatVND(trip.don.tongTien)}</p></div>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-primary">Xem chi tiết chuyến đi →</p>
      </button>
      {!cancelled && phase === 'upcoming' && onRequestCancel && (
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => onRequestCancel(trip)}
            className="w-full rounded-xl border border-red-200 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
          >
            Hủy tour & yêu cầu hoàn tiền
          </button>
        </div>
      )}
    </div>
  );
};

export default TripCard;
