import React from 'react';
import { api, type SellerReview } from '../api';
import { Card } from './ui';

interface Props {
  token: string;
  onUnauthorized: () => void;
}

const Stars: React.FC<{ rating: number | null }> = ({ rating }) => (
  <span className="text-amber-500" aria-label={rating ? `${rating} trên 5 sao` : 'Chưa chấm điểm'}>
    {'★'.repeat(rating ?? 0)}<span className="text-slate-300">{'★'.repeat(5 - (rating ?? 0))}</span>
  </span>
);

const Reviews: React.FC<Props> = ({ token, onUnauthorized }) => {
  const [data, setData] = React.useState<{ summary: { count: number; average: number | null }; reviews: SellerReview[] } | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api.sellerReviews(token).then(setData).catch((err) => {
      if ((err as Error & { status?: number }).status === 401) return onUnauthorized();
      setError((err as Error).message || 'Không tải được đánh giá');
    });
  }, [token, onUnauthorized]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Đánh giá của khách</h1>
      <p className="mt-1 text-sm text-slate-500">Đánh giá khách đã đăng sau khi hoàn thành chuyến đi của các tour bạn tổ chức.</p>

      {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {!data && !error && <p className="mt-6 text-sm text-slate-400">Đang tải...</p>}

      {data && (
        <>
          <Card className="mt-5 flex max-w-sm items-center gap-4">
            <p className="text-4xl font-bold text-slate-900">{data.summary.average ?? '—'}</p>
            <div>
              <Stars rating={data.summary.average === null ? null : Math.round(data.summary.average)} />
              <p className="text-sm text-slate-500">{data.summary.count} đánh giá</p>
            </div>
          </Card>

          {data.reviews.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Chưa có đánh giá nào. Khách chỉ đánh giá được sau khi bạn đánh dấu booking là hoàn thành.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    <Stars rating={r.rating} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{r.excerpt}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {r.author_name} · Tour: <a href={`#/tour/${r.tour_id}/sua`} className="text-[#3D72BB] hover:underline">{r.tour_name || '(chưa đặt tên)'}</a>
                    {r.published_at && ` · ${new Date(r.published_at).toLocaleDateString('vi-VN')}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default Reviews;
