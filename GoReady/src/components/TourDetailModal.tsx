import React from 'react';
import type { Tour, UserReview, AccountUser } from '../types';
import { discountPercent, formatVND } from '../utils/format';
import { onImageError } from '../utils/image';
import InteractiveMap from './InteractiveMap';

interface TourDetailModalProps {
  tour: Tour;
  isSaved: boolean;
  currentUser: AccountUser | null;
  userReviews: UserReview[];
  onAddReview: (review: Omit<UserReview, 'id' | 'date' | 'authorEmail'>) => void;
  onClose: () => void;
  onToggleSave: (tourId: string) => void;
  onBook: (tour: Tour) => void;
}

type Tab = 'itinerary' | 'map' | 'services' | 'reviews';

const TourDetailModal: React.FC<TourDetailModalProps> = ({ tour, isSaved, currentUser, userReviews, onAddReview, onClose, onToggleSave, onBook }) => {
  const [activeImage, setActiveImage] = React.useState(0);
  const [tab, setTab] = React.useState<Tab>('itinerary');
  const [reviewRating, setReviewRating] = React.useState(5);
  const [reviewContent, setReviewContent] = React.useState('');
  
  const images = [tour.coverImage, ...tour.gallery];
  const pct = discountPercent(tour.price, tour.discountPrice);
  // Tours loaded from the sheet have no map route or reviews, so those tabs are omitted for them
  const tabs = ([
    ['itinerary', 'Lịch trình'],
    ['map', 'Bản đồ'],
    ['services', 'Dịch vụ'],
    ['reviews', 'Đánh giá'],
  ] as [Tab, string][]).filter(([key]) => (key === 'map' ? tour.route.length > 0 : key === 'reviews' ? tour.reviews.length > 0 : true));

  const currentTourUserReviews = React.useMemo(() => userReviews.filter(r => r.tourId === tour.id), [userReviews, tour.id]);
  const hasReviewed = React.useMemo(() => currentUser && currentTourUserReviews.some(r => r.authorEmail === currentUser.email.toLowerCase()), [currentUser, currentTourUserReviews]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewContent.trim()) return;
    onAddReview({
      tourId: tour.id,
      rating: reviewRating,
      content: reviewContent,
    });
    setReviewContent('');
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg text-slate-600 shadow hover:text-primary"
        >
          ✕
        </button>

        <div className="overflow-y-auto">
          {/* Gallery */}
          <div className="relative h-64 sm:h-80">
            <img key={images[activeImage]} src={images[activeImage]} alt={tour.name} onError={onImageError} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-3">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${activeImage === i ? 'border-accent' : 'border-white/50'}`}
                >
                  <img src={img} alt="" onError={onImageError} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{tour.destination}</span>
                  {tour.durationLabel && (
                    <>
                      <span>•</span>
                      <span>{tour.durationLabel}</span>
                    </>
                  )}
                  {tour.hotelStars > 0 && (
                    <>
                      <span>•</span>
                      <span>{'★'.repeat(tour.hotelStars)} khách sạn</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{tour.transport}</span>
                </div>
                <h2 className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl">{tour.name}</h2>
                {tour.rating > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-amber-500">★ {tour.rating.toFixed(1)}</span>
                    {tour.reviewCount > 0 && (
                      <span className="text-slate-400">({tour.reviewCount} đánh giá · {tour.bookingCount.toLocaleString('vi-VN')} đã đặt)</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onToggleSave(tour.id)}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg ${
                  isSaved ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-500'
                }`}
              >
                {isSaved ? '♥' : '♡'}
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">{tour.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {tour.highlights.map((h) => (
                <span key={h} className="rounded-lg bg-cream px-3 py-1.5 text-xs font-medium text-primary-800">
                  ✦ {h}
                </span>
              ))}
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 no-scrollbar">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    tab === key ? 'bg-primary text-white shadow' : 'text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === 'itinerary' && (
                <div className="space-y-4">
                  {tour.itinerary.map((day) => (
                    <div key={day.day} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">{day.day}</span>
                        <h4 className="font-heading text-sm font-bold text-slate-800">{day.title}</h4>
                      </div>
                      <ul className="mt-3 space-y-2 border-l-2 border-accent/60 pl-4">
                        {day.activities.map((act, i) => (
                          <li key={i} className="relative text-sm">
                            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                            <span className="font-semibold text-primary-700">{act.time}</span>{' '}
                            <span className="font-medium text-slate-800">{act.title}</span>
                            {act.description && <p className="text-xs text-slate-500">{act.description}</p>}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        {day.meals.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1">🍴 Bữa ăn: {day.meals.join(', ')}</span>}
                        {day.accommodation && <span className="rounded-full bg-slate-100 px-2.5 py-1">🛏️ {day.accommodation}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'map' && <InteractiveMap route={tour.route} itinerary={tour.itinerary} />}

              {tab === 'services' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-emerald-700">✔ Dịch vụ bao gồm</h4>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {tour.includes.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="text-emerald-500">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-rose-600">✘ Không bao gồm</h4>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {tour.excludes.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="text-rose-500">✕</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="sm:col-span-2 rounded-xl bg-cream/60 p-4 text-xs text-primary-800">
                    <span className="font-bold">Lưu ý chính sách hoàn hủy: </span>
                    {tour.cancellationPolicy}
                  </div>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-6">
                  {/* Review Form */}
                  {currentUser && !hasReviewed && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                      <h4 className="mb-3 font-bold text-slate-800">Viết đánh giá của bạn</h4>
                      <form onSubmit={handleSubmitReview} className="flex flex-col gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className={`text-xl transition ${star <= reviewRating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Chia sẻ trải nghiệm của bạn về tour này..."
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          className="min-h-[80px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          required
                        />
                        <button type="submit" className="self-end rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-600">
                          Gửi đánh giá
                        </button>
                      </form>
                    </div>
                  )}

                  {currentTourUserReviews.length === 0 && tour.reviews.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Chưa có đánh giá nào cho tour này.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* User's own reviews first */}
                      {currentTourUserReviews.map((r) => {
                        const isMine = currentUser && r.authorEmail === currentUser.email.toLowerCase();
                        return (
                          <div key={r.id} className={`flex gap-3 rounded-xl border p-4 ${isMine ? 'border-primary/30 bg-primary/5' : 'border-slate-100'}`}>
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                              {r.authorEmail.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800">
                                    {r.authorEmail.split('@')[0]} {isMine && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Của bạn</span>}
                                  </span>
                                  <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                                </div>
                                <span className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('vi-VN')}</span>
                              </div>
                              <p className="mt-1.5 text-sm text-slate-700">{r.content}</p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Mock reviews */}
                      {tour.reviews.map((r) => (
                        <div key={r.id} className="flex gap-3 rounded-xl border border-slate-100 p-4">
                          <img src={r.avatar} alt={r.author} className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">{r.author}</span>
                                <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                              </div>
                              <span className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-slate-700">{r.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky CTA footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div>
            {pct > 0 && <div className="text-xs text-slate-400 line-through">{formatVND(tour.price)}</div>}
            <div className="font-heading text-lg font-bold text-primary-700">{formatVND(tour.discountPrice ?? tour.price)}</div>
            {tour.childPrice && <div className="text-[11px] text-slate-400">Trẻ em: {formatVND(tour.childPrice)}</div>}
          </div>
          <button
            onClick={() => onBook(tour)}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-600"
          >
            Đặt ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;
