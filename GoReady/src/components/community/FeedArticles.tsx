import React from 'react';
import { articleApi } from '../../api';
import { articleHref } from '../../config/communityRoute';
import type { ArticleSummary } from '../../types';

// Khối "Góc cẩm nang" trên Feed chính: các bài Admin đăng có showOnFeed = true (bài ghim đứng trước).
// Trình bày giống bài của người dùng; khác biệt duy nhất là tác giả là GoReady (avatar GR, dấu xác thực).
// Lỗi hoặc danh sách rỗng thì ẩn khối này, không làm hỏng Feed.
const MAX_ITEMS = 6;

export const FeedArticles: React.FC = () => {
  const [items, setItems] = React.useState<ArticleSummary[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    articleApi
      .list({ showOnFeed: true, limit: MAX_ITEMS })
      .then((res) => alive && setItems(res.items))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed || (items !== null && items.length === 0)) return null;

  if (items === null) {
    return (
      <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Đang tải cẩm nang">
        {[0, 1].map((i) => <div key={i} className="h-44 rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <section aria-label="Bài cẩm nang từ GoReady" className="flex flex-col gap-4">
      {items.map((a) => (
        <article key={a.id} className="grid gap-4 rounded-2xl border border-slate-200 p-3.5 sm:grid-cols-[210px_1fr]">
          <a href={articleHref(a.slug)} className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-sky-100 sm:h-[170px]">
            {a.coverImage ? (
              <img src={a.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-xs text-slate-600">Ảnh bìa bài viết</span>
            )}
          </a>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">GR</span>
              <b className="text-[13px] text-slate-800">{a.authorName}</b>
              <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800" title="Bài đăng bởi GoReady">✓ GoReady</span>
              {a.category && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-primary">{a.category}</span>}
              {a.isPinned && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">📌 Ghim</span>}
            </div>
            <h3 className="text-[17px] font-bold leading-snug text-slate-900">
              <a href={articleHref(a.slug)} className="hover:text-primary">{a.title}</a>
            </h3>
            {a.summary && <p className="line-clamp-2 text-[13px] text-slate-600">{a.summary}</p>}
            {a.tags.length > 0 && <p className="text-xs font-semibold text-primary">{a.tags.map((t) => `#${t}`).join(' ')}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-primary">👁 {a.viewsCount} lượt xem</span>
              <span className="rounded-full border border-slate-200 px-2.5 py-1">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
              <a href={articleHref(a.slug)} className="ml-auto rounded-full bg-primary px-3 py-1 text-white hover:opacity-90">Đọc bài</a>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
};

export default FeedArticles;
