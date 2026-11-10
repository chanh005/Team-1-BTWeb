import React from 'react';
import { communityApi } from '../../services/communityApi';

export interface EligibleBooking {
  id: string;
  bookingCode: string;
  tourId: string;
  tourName: string;
  tourCoverImage?: string;
  tourDestination: string;
  departureDate?: string;
  totalPrice: number;
}

interface CommunityVerifiedBookingSelectorProps {
  currentUser: { id: string; email: string; name: string } | null;
  selectedBookingId: string | null;
  rating: number | null;
  onSelectBooking: (booking: EligibleBooking | null) => void;
  onRatingChange: (rating: number) => void;
}

export const CommunityVerifiedBookingSelector: React.FC<CommunityVerifiedBookingSelectorProps> = ({
  currentUser,
  selectedBookingId,
  rating,
  onSelectBooking,
  onRatingChange,
}) => {
  const [bookings, setBookings] = React.useState<EligibleBooking[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    communityApi
      .getMyEligibleBookings({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
      })
      .then((data) => {
        setBookings(data);
      })
      .catch((err) => {
        console.error('Không thể lấy danh sách booking đủ điều kiện:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser]);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) || null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 text-base">
          ⭐
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-sm font-bold text-slate-900">
              Gắn chuyến đi GoReady đã trải nghiệm (Verified Review)
            </h4>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Tùy chọn
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Chọn tour đã đi để bài viết của bạn trở thành <strong className="text-amber-800">Đánh giá có xác thực</strong> kèm huy hiệu uy tín trên cộng đồng.
          </p>

          {/* Dropdown danh sách đơn tour hoàn thành */}
          <div className="mt-4">
            {loading ? (
              <div className="h-10 w-full animate-pulse rounded-xl bg-amber-100/60" />
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-white/80 p-3 text-xs text-slate-500">
                Bạn chưa có chuyến đi hoàn thành nào đủ điều kiện đánh giá. Bài viết này sẽ được đăng dưới dạng <strong>Bài chia sẻ thông thường</strong>.
              </div>
            ) : (
              <select
                value={selectedBookingId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    onSelectBooking(null);
                  } else {
                    const found = bookings.find((b) => b.id === val);
                    onSelectBooking(found || null);
                  }
                }}
                className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
              >
                <option value="">-- Không gắn tour (Đăng bài chia sẻ thông thường) --</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    Mã {b.bookingCode}: {b.tourName} ({b.departureDate ? `Ngày đi ${b.departureDate}` : 'Đã hoàn thành'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Khối Đánh giá số sao (Rating 1-5 sao) khi đã chọn booking */}
          {selectedBooking && (
            <div className="mt-4 rounded-xl bg-white p-4 border border-amber-200 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Chấm điểm chất lượng chuyến đi <span className="text-rose-500">*</span>:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bắt buộc chọn từ 1 đến 5 sao cho tour "{selectedBooking.tourName}"
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onRatingChange(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      title={`${star} sao`}
                    >
                      <svg
                        className={`h-6 w-6 ${
                          rating && star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 text-slate-200 hover:fill-amber-300'
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-amber-800">
                    {rating ? `${rating} / 5 sao` : 'Chưa chấm điểm'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityVerifiedBookingSelector;

