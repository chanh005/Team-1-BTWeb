import React from 'react';
import TourCard from '../components/TourCard';
import TourDetailPage from '../components/TourDetailPage';
import type { GroupSizeTag, Tour } from '../types';
import type { TourFormState } from './tourFormModel';
import { outlineBtn } from './ui';

/** Dựng một đối tượng Tour (đúng kiểu phía người mua) từ dữ liệu đang nhập, để dùng chính thẻ và trang chi tiết thật. */
export function toPreviewTour(f: TourFormState): Tour {
  const duration = Math.max(Number(f.duration) || 1, 1);
  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  const stars = Number(f.hotelStars);
  return {
    id: 'preview', slug: 'preview', name: f.name || '(chưa đặt tên)', destination: f.destination || '—', country: 'Việt Nam', region: 'Việt Nam',
    coverImage: f.coverImage, gallery: f.images, shortDescription: f.shortDescription, description: f.shortDescription,
    price: Number(f.price) || 0, childPrice: f.childPrice ? Number(f.childPrice) : undefined, duration, nights: Number(f.nights) || 0,
    departure: f.departure || '—', hotelStars: (stars === 3 || stars === 4 || stars === 5 ? stars : 0) as Tour['hotelStars'], transport: f.transport,
    styleTags: [], groupSizeTags: f.groupSizeTags as GroupSizeTag[], rating: 0, reviewCount: 0, bookingCount: 0,
    itinerary: f.itinerary.map((d, i) => ({
      day: i + 1, title: d.title || `Ngày ${i + 1}`,
      activities: d.description ? [{ time: '', title: d.title || `Ngày ${i + 1}`, description: d.description }] : [],
      meals: [d.has_breakfast && 'Sáng', d.has_lunch && 'Trưa', d.has_dinner && 'Tối'].filter(Boolean) as string[],
    })),
    includes: lines(f.includes), excludes: lines(f.excludes), reviews: [], highlights: [], cancellationPolicy: f.cancellationPolicy, route: [],
    seller_id: 'preview',
    sellerDepartures: f.departures
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.departure_date))
      .map((d, i) => ({ id: i + 1, date: d.departure_date, price: d.price ? Number(d.price) : null, maxSeats: Number(d.max_seats) || 0, bookedSeats: 0 })),
  };
}

/** Nếu trang chi tiết gặp dữ liệu chưa đủ (bản nháp) thì báo nhẹ nhàng thay vì làm hỏng cả trang. */
class SafeBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p className="rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">Chưa dựng được trang chi tiết vì tour còn thiếu thông tin. Hãy điền thêm rồi xem trước lại.</p>
      : this.props.children;
  }
}

const TourPreview: React.FC<{ form: TourFormState; onClose: () => void }> = ({ form, onClose }) => {
  const [tab, setTab] = React.useState<'card' | 'detail'>('card');
  const tour = React.useMemo(() => toPreviewTour(form), [form]);
  const noop = () => {};

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-5xl rounded-xl bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Xem trước như khách</h2>
            <p className="text-sm text-slate-500">Đây là cách tour hiển thị sau khi được duyệt. Chưa lưu gì lên hệ thống.</p>
          </div>
          <button onClick={onClose} className={outlineBtn}>Đóng</button>
        </div>
        <div className="mt-4 flex gap-2">
          {([['card', 'Thẻ ở trang Khám phá'], ['detail', 'Trang chi tiết tour']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${tab === v ? 'border-[#3D72BB] bg-[#3D72BB] text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{label}</button>
          ))}
        </div>
        <div className="mt-4">
          {tab === 'card' ? (
            <div className="max-w-sm">
              <TourCard tour={tour} isSaved={false} isComparing={false} compareDisabled onOpenDetail={noop} onToggleSave={noop} onToggleCompare={noop} />
            </div>
          ) : (
            <SafeBoundary>
              <TourDetailPage tour={tour} isSaved={false} onBack={onClose} onToggleSave={noop} onBook={() => alert('Đây là bản xem trước, chưa thể đặt tour.')} />
            </SafeBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourPreview;
