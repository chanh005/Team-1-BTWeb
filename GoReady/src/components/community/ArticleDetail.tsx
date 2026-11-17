import React from 'react';
import { articleApi } from '../../api';
import { communitySectionHref } from '../../config/communityRoute';
import type { Article } from '../../types';

// Trang đọc một bài cẩm nang / thông báo theo slug.
// SEO: cập nhật <title>, meta description, canonical và thẻ Open Graph khi mở bài; trả lại giá trị cũ khi rời trang.

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Đặt (hoặc tạo) thẻ meta; trả về hàm khôi phục giá trị cũ. */
function setMeta(selector: string, attr: 'name' | 'property', key: string, value: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute('content');
  el.setAttribute('content', value);
  return () => {
    if (created) el?.remove();
    else if (previous !== null) el?.setAttribute('content', previous);
  };
}

function useArticleSeo(article: Article | null, slug: string) {
  React.useEffect(() => {
    if (!article) return;
    const title = article.metaTitle || article.title;
    const description = article.metaDescription || article.summary || '';
    const url = `${window.location.origin}/${window.location.hash.split('?')[0]}`;
    const previousTitle = document.title;
    document.title = `${title} | GoReady`;

    const restores = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:type"]', 'property', 'og:type', 'article'),
      setMeta('meta[property="og:url"]', 'property', 'og:url', url),
    ];
    if (article.coverImage) {
      const image = article.coverImage.startsWith('http') ? article.coverImage : `${window.location.origin}${article.coverImage}`;
      restores.push(setMeta('meta[property="og:image"]', 'property', 'og:image', image));
    }

    // Link canonical: tạo mới nếu chưa có, gỡ khi rời trang
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
      if (createdCanonical) canonical?.remove();
    };
    // slug nằm trong article.slug; không cần phụ thuộc thêm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, slug]);
}

export const ArticleDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const [article, setArticle] = React.useState<Article | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');

  React.useEffect(() => {
    let alive = true;
    setStatus('loading');
    articleApi
      .getBySlug(slug)
      .then((a) => {
        if (!alive) return;
        setArticle(a);
        setStatus('ready');
      })
      .catch((e: Error & { status?: number }) => {
        if (!alive) return;
        setArticle(null);
        setStatus(e.status === 404 ? 'notfound' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useArticleSeo(article, slug);

  const backLink = (
    <a href={communitySectionHref('feed')} className="text-sm font-semibold text-primary hover:underline">← Về Feed chính</a>
  );

  if (status === 'loading') {
    return (
      <section className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Đang tải bài viết">
        <div className="h-8 w-2/3 rounded bg-slate-100" />
        <div className="h-56 rounded-2xl bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
      </section>
    );
  }

  if (status === 'notfound') {
    return (
      <section className="flex flex-col gap-4 text-center">
        {backLink}
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-sm text-slate-500">Bài viết này không tồn tại hoặc chưa được đăng.</p>
      </section>
    );
  }

  if (status === 'error' || !article) {
    return (
      <section className="flex flex-col gap-4">
        {backLink}
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          <p>Không tải được bài viết.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">Thử lại</button>
        </div>
      </section>
    );
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      {backLink}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary px-2.5 py-1 font-semibold text-white">Chính thức</span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-primary">{article.authorName}</span>
          {article.category && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{article.category}</span>}
        </div>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">{article.title}</h1>
        <p className="text-sm text-slate-500">
          Cập nhật {fmtDate(article.updatedAt)} · {article.viewsCount} lượt xem
        </p>
      </header>

      {article.coverImage && <img src={article.coverImage} alt={article.title} className="aspect-video w-full rounded-2xl object-cover" />}
      {article.summary && <p className="text-base font-medium leading-relaxed text-slate-700">{article.summary}</p>}

      {/* Nội dung đã được server làm sạch (chỉ còn thẻ an toàn) khi lưu */}
      <div className="article-body text-[15px] leading-relaxed text-slate-800" dangerouslySetInnerHTML={{ __html: article.content }} />

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
          {article.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
};

export default ArticleDetail;
