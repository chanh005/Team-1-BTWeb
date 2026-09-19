import React from 'react';
import type { Tour } from '../../types';
import { formatVND, uid } from '../../utils/format';
import { onImageError } from '../../utils/image';

interface TourManagementProps {
  tours: Tour[];
  onAdd: (tour: Tour) => void;
  onUpdate: (tour: Tour) => void;
  onDelete: (tourId: string) => void;
  onToggleHidden: (tourId: string) => void;
  /** One-off message from the app, e.g. that the Google Sheet tours were just added. */
  notice?: { tone: 'ok' | 'warn'; text: string } | null;
  onDismissNotice?: () => void;
}

type TourFormState = {
  name: string;
  destination: string;
  country: string;
  region: 'Việt Nam' | 'Quốc tế';
  coverImage: string;
  price: string;
  discountPrice: string;
  duration: string;
  nights: string;
  hotelStars: '0' | '3' | '4' | '5'; // 0 = không xếp sao (tour nhập từ Google Sheet có thể không ghi hạng)
  transport: string;
  shortDescription: string;
};

const EMPTY_FORM: TourFormState = {
  name: '',
  destination: '',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: '',
  price: '',
  discountPrice: '',
  duration: '3',
  nights: '2',
  hotelStars: '4',
  transport: 'Máy bay + Xe đưa đón',
  shortDescription: '',
};

const tourToForm = (t: Tour): TourFormState => ({
  name: t.name,
  destination: t.destination,
  country: t.country,
  region: t.region,
  coverImage: t.coverImage,
  price: String(t.price),
  discountPrice: t.discountPrice ? String(t.discountPrice) : '',
  duration: String(t.duration),
  nights: String(t.nights),
  hotelStars: String(t.hotelStars) as TourFormState['hotelStars'],
  transport: t.transport,
  shortDescription: t.shortDescription,
});

const TourManagement: React.FC<TourManagementProps> = ({ tours, onAdd, onUpdate, onDelete, onToggleHidden, notice, onDismissNotice }) => {
  const [query, setQuery] = React.useState('');
  const [editingTour, setEditingTour] = React.useState<Tour | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<TourFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = React.useState<Tour | null>(null);

  const filtered = tours.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.destination.toLowerCase().includes(query.toLowerCase())
  );

  const openAddForm = () => {
    setEditingTour(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (tour: Tour) => {
    setEditingTour(tour);
    setForm(tourToForm(tour));
    setShowForm(true);
  };

  const patchForm = (patch: Partial<TourFormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price) || 0;
    const discountPrice = form.discountPrice ? Number(form.discountPrice) : undefined;
    const coverImage = form.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop&q=80';

    if (editingTour) {
      onUpdate({
        ...editingTour,
        name: form.name,
        destination: form.destination,
        country: form.country,
        region: form.region,
        coverImage,
        price,
        discountPrice,
        duration: Number(form.duration) || 1,
        nights: Number(form.nights) || 0,
        hotelStars: Number(form.hotelStars) as Tour['hotelStars'],
        transport: form.transport,
        shortDescription: form.shortDescription,
      });
    } else {
      const newTour: Tour = {
        id: uid('tour'),
        slug: uid('tour'),
        name: form.name,
        destination: form.destination,
        country: form.country,
        region: form.region,
        coverImage,
        gallery: [coverImage],
        shortDescription: form.shortDescription,
        description: form.shortDescription,
        price,
        discountPrice,
        duration: Number(form.duration) || 1,
        nights: Number(form.nights) || 0,
        departure: 'TP. Hồ Chí Minh',
        hotelStars: Number(form.hotelStars) as Tour['hotelStars'],
        transport: form.transport,
        styleTags: [],
        groupSizeTags: [],
        rating: 0,
        reviewCount: 0,
        bookingCount: 0,
        itinerary: [],
        includes: [],
        excludes: [],
        reviews: [],
        highlights: [],
        cancellationPolicy: 'Hoàn 100% nếu huỷ trước 7 ngày khởi hành.',
        route: [],
      };
      onAdd(newTour);
    }
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên tour hoặc điểm đến..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary sm:max-w-xs"
        />
        <button
          onClick={openAddForm}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600"
        >
          + Thêm tour mới
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={onDismissNotice} aria-label="Đóng thông báo" className="shrink-0 font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Tour</th>
              <th className="px-4 py-3">Điểm đến</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Đánh giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className={t.hidden ? 'opacity-50' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={t.coverImage} alt={t.name} onError={onImageError} className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <span className="line-clamp-1 max-w-[220px] font-semibold text-slate-800">{t.name}</span>
                      {t.code && <span className="text-[11px] text-slate-400">{t.code}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.destination}</td>
                <td className="px-4 py-3 font-semibold text-primary-700">{formatVND(t.discountPrice ?? t.price)}</td>
                <td className="px-4 py-3 text-slate-600">★ {t.rating.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleHidden(t.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      t.hidden ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {t.hidden ? 'Đang ẩn' : 'Đang hiện'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditForm(t)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary">
                      Sửa
                    </button>
                    <button onClick={() => setDeleteTarget(t)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  Không tìm thấy tour phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">{editingTour ? 'Sửa tour' : 'Thêm tour mới'}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Tên tour</span>
                <input required value={form.name} onChange={(e) => patchForm({ name: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Điểm đến</span>
                <input required value={form.destination} onChange={(e) => patchForm({ destination: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Quốc gia</span>
                <input required value={form.country} onChange={(e) => patchForm({ country: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Khu vực</span>
                <select value={form.region} onChange={(e) => patchForm({ region: e.target.value as 'Việt Nam' | 'Quốc tế' })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="Việt Nam">Việt Nam</option>
                  <option value="Quốc tế">Quốc tế</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Hạng khách sạn</span>
                <select value={form.hotelStars} onChange={(e) => patchForm({ hotelStars: e.target.value as TourFormState['hotelStars'] })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="0">Không xếp sao</option>
                  <option value="3">3 sao</option>
                  <option value="4">4 sao</option>
                  <option value="5">5 sao</option>
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Ảnh bìa (URL)</span>
                <input value={form.coverImage} onChange={(e) => patchForm({ coverImage: e.target.value })} placeholder="https://..." className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Giá gốc (VNĐ)</span>
                <input required type="number" min="0" value={form.price} onChange={(e) => patchForm({ price: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Giá khuyến mãi (nếu có)</span>
                <input type="number" min="0" value={form.discountPrice} onChange={(e) => patchForm({ discountPrice: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Số ngày</span>
                <input required type="number" min="1" value={form.duration} onChange={(e) => patchForm({ duration: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Số đêm</span>
                <input required type="number" min="0" value={form.nights} onChange={(e) => patchForm({ nights: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Phương tiện</span>
                <input value={form.transport} onChange={(e) => patchForm({ transport: e.target.value })} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Mô tả ngắn</span>
                <textarea value={form.shortDescription} onChange={(e) => patchForm({ shortDescription: e.target.value })} rows={2} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
                Huỷ
              </button>
              <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-primary-600">
                {editingTour ? 'Lưu thay đổi' : 'Thêm tour'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">Xoá tour?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Bạn có chắc muốn xoá <span className="font-semibold text-slate-700">{deleteTarget.name}</span>? Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300">
                Huỷ
              </button>
              <button
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-card hover:bg-red-600"
              >
                Xoá tour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourManagement;
