import React from 'react';
import type { AccountUser, Article, ArticleCategory, Tour } from '../types';
import { api } from '../api';
import { usePolledResource } from '../hooks/usePolledResource';
import { formatShortDate } from '../utils/format';
import { onImageError } from '../utils/image';
import ArticleFeedback from './ArticleFeedback';
import ArticleRelatedTours from './ArticleRelatedTours';

interface NewsFeedProps {
  /** Mọi tour có thể mở (để hiện tour gắn kèm bài viết). */
  tours: Tour[];
  currentUser: AccountUser | null;
  onOpenTour: (tourId: string) => void;
  onRequireLogin: () => void;
}

const CATEGORIES: (ArticleCategory | 'all')[] = ['all', 'Tin tức', 'Cẩm nang du lịch'];

const publishedOn = (a: Article) => formatShortDate(a.publishAt ?? a.createdAt);

// ~200 từ/phút, tối thiểu 1 phút
const readingMinutes = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).filter(Boolean).length / 200));

const ArticleCard: React.FC<{ article: Article; onOpen: () => void }> = ({ article: a, onOpen }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-card">
    <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
      <div className="relative h-36 w-full overflow-hidden">
        <img src={a.coverImage} alt={a.title} loading="lazy" onError={onImageError} className="h-full w-full object-cover" />
        {a.pinned && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-primary-700 shadow-soft">📌 Nổi bật</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-max rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">{a.category}</span>
        <h3 className="line-clamp-2 font-heading text-sm font-bold text-slate-900">{a.title}</h3>
        <p className="line-clamp-3 text-xs text-slate-500">{a.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11px] text-slate-400">
          <span>{publishedOn(a)}</span>
          <span>👁 {a.views.toLocaleString('vi-VN')}</span>
          {a.ratingCount > 0 && <span className="text-amber-500">★ {a.ratingAvg.toFixed(1)}</span>}
          <span>💬 {a.commentCount}</span>
        </div>
      </div>
    </button>
  </article>
);

/**
 * Bảng tin: bài viết admin đã đăng + trang đọc bài (nội dung, tour gắn kèm, đánh giá, bình luận).
 * getPublicArticles đã bỏ bài ẩn, bản nháp và bài hẹn giờ chưa đến lúc; bài ghim đứng đầu.
 */
const NewsFeed: React.FC<NewsFeedProps> = ({ tours, currentUser, onOpenTour, onRequireLogin }) => {
  const { data } = usePolledResource(api.getPublicArticles);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<ArticleCategory | 'all'>('all');
  const [query, setQuery] = React.useState('');
  // Lượt xem vừa đếm cho bài đang mở, hiện ngay mà không phải chờ lần poll tiếp theo
  const [viewsNow, setViewsNow] = React.useState<Record<string, number>>({});

  const articles = data ?? [];
  const openArticle = openId ? articles.find((a) => a.id === openId) ?? null : null;

  const open = (a: Article) => {
    setOpenId(a.id);
    window.scrollTo({ top: 0 });
    api
      .trackArticleView(a.id)
      .then(({ views }) => setViewsNow((v) => ({ ...v, [a.id]: views })))
      .catch(() => {}); // không đếm được lượt xem thì vẫn cho đọc bài
  };

  if (openArticle) {
    const a = openArticle;
    return (
      <main className="container-px mx-auto max-w-3xl py-10">
        <button type="button" onClick={() => setOpenId(null)} className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại Bảng tin
        </button>
        <span className="mt-6 block w-max rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">{a.category}</span>
        <h1 className="mt-3 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">{a.title}</h1>
        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-400">
          {a.author && <span>{a.author}</span>}
          <span>{publishedOn(a)}</span>
          <span>{readingMinutes(a.content)} phút đọc</span>
          <span>👁 {(viewsNow[a.id] ?? a.views).toLocaleString('vi-VN')} lượt xem</span>
        </p>
        <img src={a.coverImage} alt={a.title} onError={onImageError} className="mt-6 aspect-video w-full rounded-2xl object-cover" />
        {a.excerpt && <p className="mt-6 text-base font-semibold text-slate-700">{a.excerpt}</p>}
        <div className="mt-4 whitespace-pre-line break-words text-[15px] leading-7 text-slate-700">{a.content}</div>

        <div className="mt-10 flex flex-col gap-10">
          <ArticleRelatedTours tourIds={a.relatedTourIds} tours={tours} onOpenTour={onOpenTour} />
          <ArticleFeedback articleId={a.id} currentUser={currentUser} onRequireLogin={onRequireLogin} />
        </div>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = articles.filter(
    (a) =>
      (category === 'all' || a.category === category) &&
      (!q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q))
  );

  return (
    <main className="container-px mx-auto py-10">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Bảng tin</h1>
      <p className="mt-1 text-sm text-slate-500">Tin tức mới nhất và cẩm nang du lịch từ GoReady.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                category === c ? 'bg-primary text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary'
              }`}
            >
              {c === 'all' ? 'Tất cả' : c}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài viết..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-primary sm:max-w-xs"
        />
      </div>

      {data === null ? (
        <p className="mt-8 text-sm text-slate-400">Đang tải bài viết…</p>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">{articles.length === 0 ? 'Chưa có bài viết nào.' : 'Không tìm thấy bài viết phù hợp.'}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((a) => (
            <ArticleCard key={a.id} article={a} onOpen={() => open(a)} />
          ))}
        </div>
      )}
    </main>
  );
};

export default NewsFeed;
