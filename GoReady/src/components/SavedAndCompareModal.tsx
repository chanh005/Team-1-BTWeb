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

const ROWS: { label: string; render: (t: Tour) => React.ReactNode }[] = [
  { label: 'Giá', render: (t) => <span className="font-bold text-primary-700">{formatVND(t.discountPrice ?? t.price)}</span> },
  { label: 'Thời lượng', render: (t) => t.durationLabel || `${t.duration} ngày ${t.nights} đêm` },
  { label: 'Khách sạn', render: (t) => (t.hotelStars > 0 ? `${'★'.repeat(t.hotelStars)} (${t.hotelStars} sao)` : '—') },
  { label: 'Điểm nhấn lộ trình', render: (t) => (
    <ul className="list-disc space-y-0.5 pl-4 text-left text-xs">
      {t.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
    </ul>
  ) },
  { label: 'Chính sách hoàn hủy', render: (t) => <span className="text-xs">{t.cancellationPolicy}</span> },
  { label: 'Dịch vụ đi kèm', render: (t) => `${t.includes.length} dịch vụ bao gồm` },
  { label: 'Đánh giá', render: (t) => (t.reviewCount > 0 ? `★ ${t.rating.toFixed(1)} (${t.reviewCount})` : 'Chưa có đánh giá') },
];

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slideUp sm:h-[85vh] sm:rounded-2xl"
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
                  <thead>
                    <tr>
                      <th className="w-32 p-2 text-left text-xs text-slate-400"></th>
                      {compareTours.map((t) => (
                        <th key={t.id} className="p-2 text-center align-top">
                          <div className="mx-auto w-40 overflow-hidden rounded-xl border border-slate-100">
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
                    {ROWS.map((row) => (
                      <tr key={row.label} className="odd:bg-slate-50">
                        <td className="p-2.5 align-top text-xs font-semibold text-slate-500">{row.label}</td>
                        {compareTours.map((t) => (
                          <td key={t.id} className="p-2.5 text-center align-top text-slate-700">
                            {row.render(t)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2.5"></td>
                      {compareTours.map((t) => (
                        <td key={t.id} className="p-2.5 text-center">
                          <button
                            onClick={() => onBook(t)}
                            className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-card hover:bg-primary-600"
                          >
                            Đặt tour này
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SavedAndCompareModal;
