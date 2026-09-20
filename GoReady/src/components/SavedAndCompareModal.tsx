import React from 'react';
import type { Tour } from '../types';
import { formatVND } from '../utils/format';

interface SavedAndCompareModalProps {
  savedTours: Tour[];
  compareTours: Tour[];
  onClose: () => void;
  onRemoveSaved: (tourId: string) => void;
  onToggleCompare: (tourId: string) => void;
  onOpenDetail: (tour: Tour) => void;
  onBook: (tour: Tour) => void;
}

const BestBadge = () => (
  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-sm">
    🏆 Tốt nhất
  </span>
);

const SavedAndCompareModal: React.FC<SavedAndCompareModalProps> = ({
  savedTours,
  compareTours,
  onClose,
  onRemoveSaved,
  onToggleCompare,
  onOpenDetail,
  onBook,
}) => {
  const [tab, setTab] = React.useState<'saved' | 'compare'>(compareTours.length > 0 ? 'compare' : 'saved');
  const [detailTour, setDetailTour] = React.useState<Tour | null>(null);

  // Determine best metrics across compareTours (only when >1 tour)
  const compareStats = React.useMemo(() => {
    if (compareTours.length < 2) {
      return {
        bestPriceIds: new Set<string>(),
        bestStarsIds: new Set<string>(),
        bestIncludesIds: new Set<string>(),
        bestRatingIds: new Set<string>(),
      };
    }

    // 1. Price (lower is better)
    const prices = compareTours.map((t) => t.discountPrice ?? t.price);
    const minPrice = Math.min(...prices);
    const hasPriceDiff = prices.some((p) => p !== minPrice);
    const bestPriceIds = new Set(
      hasPriceDiff ? compareTours.filter((t) => (t.discountPrice ?? t.price) === minPrice).map((t) => t.id) : []
    );

    // 2. Hotel stars (higher is better)
    const stars = compareTours.map((t) => t.hotelStars);
    const maxStars = Math.max(...stars);
    const hasStarsDiff = maxStars > 0 && stars.some((s) => s !== maxStars);
    const bestStarsIds = new Set(
      hasStarsDiff ? compareTours.filter((t) => t.hotelStars === maxStars).map((t) => t.id) : []
    );

    // 3. Included services (higher count is better)
    const includesCounts = compareTours.map((t) => t.includes?.length ?? 0);
    const maxIncludes = Math.max(...includesCounts);
    const hasIncludesDiff = maxIncludes > 0 && includesCounts.some((c) => c !== maxIncludes);
    const bestIncludesIds = new Set(
      hasIncludesDiff ? compareTours.filter((t) => (t.includes?.length ?? 0) === maxIncludes).map((t) => t.id) : []
    );

    // 4. Rating (higher is better)
    const ratings = compareTours.map((t) => t.rating);
    const maxRating = Math.max(...ratings);
    const hasRatingDiff = maxRating > 0 && ratings.some((r) => r !== maxRating);
    const bestRatingIds = new Set(
      hasRatingDiff ? compareTours.filter((t) => t.rating === maxRating).map((t) => t.id) : []
    );

    return {
      bestPriceIds,
      bestStarsIds,
      bestIncludesIds,
      bestRatingIds,
    };
  }, [compareTours]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm font-semibold">
            <button
              onClick={() => setTab('saved')}
              className={`rounded-full px-4 py-1.5 transition ${tab === 'saved' ? 'bg-primary text-white' : 'text-slate-600'}`}
            >
              Thư viện đã lưu ({savedTours.length})
            </button>
            <button
              onClick={() => setTab('compare')}
              className={`rounded-full px-4 py-1.5 transition ${tab === 'compare' ? 'bg-primary text-white' : 'text-slate-600'}`}
            >
              So sánh tour ({compareTours.length})
            </button>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-500 hover:text-primary">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {tab === 'saved' &&
            (savedTours.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-slate-400">
                <div>
                  <p className="text-3xl">♡</p>
                  <p className="mt-2 text-sm">Bạn chưa lưu tour nào. Nhấn biểu tượng trái tim trên thẻ tour để lưu lại!</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedTours.map((t) => (
                  <div key={t.id} className="overflow-hidden rounded-xl border border-slate-100">
                    <img src={t.coverImage} alt={t.name} className="h-28 w-full object-cover" />
                    <div className="p-3">
                      <h4 className="line-clamp-1 text-sm font-bold text-slate-800">{t.name}</h4>
                      <p className="mt-1 font-bold text-primary-700">{formatVND(t.discountPrice ?? t.price)}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => onOpenDetail(t)}
                          className="flex-1 rounded-lg border border-primary py-1.5 text-xs font-semibold text-primary hover:bg-primary-50"
                        >
                          Xem
                        </button>
                        <button
                          onClick={() => onToggleCompare(t.id)}
                          className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
                        >
                          {compareTours.some((c) => c.id === t.id) ? '✓ So sánh' : '+ So sánh'}
                        </button>
                        <button
                          onClick={() => onRemoveSaved(t.id)}
                          className="rounded-lg border border-slate-200 px-2 text-xs text-slate-400 hover:border-rose-300 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'compare' &&
            (compareTours.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-slate-400">
                <div>
                  <p className="text-3xl">⚖️</p>
                  <p className="mt-2 text-sm">Chọn 2-3 tour để so sánh chi tiết cạnh nhau.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      <th className="sticky top-0 z-10 w-32 bg-white p-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Đặc tính
                      </th>
                      {compareTours.map((t) => (
                        <th key={t.id} className="sticky top-0 z-10 min-w-[160px] bg-white p-2.5 text-center align-top border-b border-slate-100">
                          <div className="mx-auto w-40 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xs">
                            <img src={t.coverImage} alt={t.name} className="h-24 w-full object-cover" />
                            <div className="p-2">
                              <p className="line-clamp-2 text-xs font-bold text-slate-800">{t.name}</p>
                              <button
                                onClick={() => onToggleCompare(t.id)}
                                className="mt-1.5 text-[10px] font-semibold text-rose-500 hover:underline"
                              >
                                Bỏ so sánh
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Giá */}
                    <tr className="odd:bg-slate-50/50">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Giá</td>
                      {compareTours.map((t) => {
                        const isBest = compareStats.bestPriceIds.has(t.id);
                        return (
                          <td key={t.id} className={`p-3 text-center align-top text-slate-700 ${isBest ? 'bg-emerald-50/80 font-medium' : ''}`}>
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-primary-700">{formatVND(t.discountPrice ?? t.price)}</span>
                              {isBest && <BestBadge />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 2: Thời lượng */}
                    <tr className="even:bg-white">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Thời lượng</td>
                      {compareTours.map((t) => (
                        <td key={t.id} className="p-3 text-center align-top text-slate-700">
                          {t.durationLabel || `${t.duration} ngày ${t.nights} đêm`}
                        </td>
                      ))}
                    </tr>

                    {/* Row 3: Khách sạn */}
                    <tr className="odd:bg-slate-50/50">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Khách sạn</td>
                      {compareTours.map((t) => {
                        const isBest = compareStats.bestStarsIds.has(t.id);
                        return (
                          <td key={t.id} className={`p-3 text-center align-top text-slate-700 ${isBest ? 'bg-emerald-50/80 font-medium' : ''}`}>
                            <div className="flex flex-col items-center">
                              <span>{t.hotelStars > 0 ? `${'★'.repeat(t.hotelStars)} (${t.hotelStars} sao)` : '—'}</span>
                              {isBest && <BestBadge />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 4: Điểm nhấn lộ trình */}
                    <tr className="even:bg-white">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Điểm nhấn lộ trình</td>
                      {compareTours.map((t) => (
                        <td key={t.id} className="p-3 text-center align-top text-slate-700">
                          {!t.highlights || t.highlights.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>
                          ) : (
                            <ul className="list-disc space-y-0.5 pl-4 text-left text-xs text-slate-600">
                              {t.highlights.slice(0, 4).map((h) => (
                                <li key={h}>{h}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Row 5: Chính sách hoàn hủy */}
                    <tr className="odd:bg-slate-50/50">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Chính sách hoàn hủy</td>
                      {compareTours.map((t) => (
                        <td key={t.id} className="p-3 text-center align-top text-xs text-slate-600">
                          {t.cancellationPolicy || 'Chưa cập nhật'}
                        </td>
                      ))}
                    </tr>

                    {/* Row 6: Dịch vụ đi kèm */}
                    <tr className="even:bg-white">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Dịch vụ đi kèm</td>
                      {compareTours.map((t) => {
                        const isBest = compareStats.bestIncludesIds.has(t.id);
                        const count = t.includes?.length ?? 0;
                        return (
                          <td key={t.id} className={`p-3 text-center align-top text-slate-700 ${isBest ? 'bg-emerald-50/80 font-medium' : ''}`}>
                            <div className="flex flex-col items-center">
                              <span>{count > 0 ? `${count} dịch vụ bao gồm` : 'Chưa cập nhật'}</span>
                              {isBest && <BestBadge />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row 7: Đánh giá */}
                    <tr className="odd:bg-slate-50/50">
                      <td className="p-3 align-top text-xs font-semibold text-slate-500">Đánh giá</td>
                      {compareTours.map((t) => {
                        const isBest = compareStats.bestRatingIds.has(t.id);
                        return (
                          <td key={t.id} className={`p-3 text-center align-top text-slate-700 ${isBest ? 'bg-emerald-50/80 font-medium' : ''}`}>
                            <div className="flex flex-col items-center">
                              <span>{t.reviewCount > 0 ? `★ ${t.rating.toFixed(1)} (${t.reviewCount})` : 'Chưa có đánh giá'}</span>
                              {isBest && <BestBadge />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Action buttons */}
                    <tr className="even:bg-white">
                      <td className="p-3"></td>
                      {compareTours.map((t) => (
                        <td key={t.id} className="p-3 text-center align-top">
                          <div className="flex flex-col gap-2 sm:flex-row sm:gap-1.5">
                            <button
                              onClick={() => setDetailTour(t)}
                              className="flex-1 rounded-lg border border-primary py-2 text-xs font-bold text-primary hover:bg-primary-50 transition"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => onBook(t)}
                              className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-card hover:bg-primary-600 transition"
                            >
                              Đặt tour này
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
        </div>

        {/* In-Modal Itinerary Detail View */}
        {detailTour && (
          <div className="absolute inset-0 z-30 flex flex-col bg-white animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDetailTour(null)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  ← Quay lại so sánh
                </button>
                <h3 className="line-clamp-1 font-heading text-sm font-bold text-slate-900 sm:text-base">
                  Lịch trình chi tiết: {detailTour.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailTour(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <img src={detailTour.coverImage} alt={detailTour.name} className="h-16 w-24 rounded-xl object-cover" />
                  <div>
                    <span className="text-xs text-slate-500">
                      {detailTour.destination} • {detailTour.durationLabel || `${detailTour.duration} ngày ${detailTour.nights} đêm`}
                    </span>
                    <h4 className="font-bold text-slate-800">{detailTour.name}</h4>
                    {detailTour.hotelStars > 0 && (
                      <span className="text-xs text-amber-500">{'★'.repeat(detailTour.hotelStars)} {detailTour.hotelStars} sao</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Giá tour</span>
                    <p className="font-heading text-lg font-bold text-primary-700">{formatVND(detailTour.discountPrice ?? detailTour.price)}</p>
                  </div>
                  <button
                    onClick={() => onBook(detailTour)}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600 transition"
                  >
                    Đặt tour này
                  </button>
                </div>
              </div>

              {detailTour.itinerary && detailTour.itinerary.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-400">Lịch trình chuyến đi</h4>
                  <div className="space-y-3">
                    {detailTour.itinerary.map((day) => (
                      <div key={day.day} className="rounded-xl border border-slate-100 p-4 bg-white shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                            {day.day}
                          </span>
                          <h5 className="font-heading text-sm font-bold text-slate-800">{day.title}</h5>
                        </div>
                        {day.activities && day.activities.length > 0 && (
                          <ul className="mt-3 space-y-2 border-l-2 border-primary/30 pl-4">
                            {day.activities.map((act, i) => (
                              <li key={i} className="relative text-xs sm:text-sm">
                                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                <span className="font-semibold text-primary-700">{act.time}</span>{' '}
                                <span className="font-medium text-slate-800">{act.title}</span>
                                {act.description && <p className="mt-0.5 text-xs text-slate-500">{act.description}</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {day.meals && day.meals.length > 0 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1">🍴 Bữa ăn: {day.meals.join(', ')}</span>
                          )}
                          {day.accommodation && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1">🛏️ {day.accommodation}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
                  <p className="font-semibold text-slate-700">Mô tả chuyến đi</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{detailTour.description || detailTour.shortDescription}</p>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {detailTour.includes && detailTour.includes.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">✓ Dịch vụ bao gồm</h5>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {detailTour.includes.map((s) => (
                        <li key={s} className="flex gap-1.5"><span className="text-emerald-500">✓</span> {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailTour.excludes && detailTour.excludes.length > 0 && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-700">✕ Chưa bao gồm</h5>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {detailTour.excludes.map((s) => (
                        <li key={s} className="flex gap-1.5"><span className="text-rose-500">✕</span> {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedAndCompareModal;
