import React from 'react';
import type { CommunityPost } from '../../types/community';
import type { Tour } from '../../types';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityApi } from '../../services/communityApi';
import { CommunityTourCard } from './CommunityTourCard';
import { CommunityShareBar } from './CommunityShareBar';
import { CommunityComments } from './CommunityComments';
import { ReportModal } from './ReportModal';
import { communityHref } from '../../hooks/useCommunityRoute';

interface CommunityPostDetailPageProps {
  slug: string;
  tours: Tour[];
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  onOpenTour?: (tourId: string) => void;
  onBackToFeed: () => void;
}

export const CommunityPostDetailPage: React.FC<CommunityPostDetailPageProps> = ({
  slug,
  tours,
  currentUser,
  onOpenLogin,
  onOpenTour,
  onBackToFeed,
}) => {
  const [post, setPost] = React.useState<CommunityPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorStatus, setErrorStatus] = React.useState<number | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Modal báo cáo
  const [reportTarget, setReportTarget] = React.useState<{ type: 'post' | 'comment'; id: string; title?: string } | null>(null);

  // Tăng view một lần duy nhất khi đọc bài
  const viewIncremented = React.useRef(false);

  // Tải chi tiết bài viết
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    const authHeaders = currentUser
      ? {
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
        }
      : undefined;

    communityApi
      .getPostBySlug(slug, authHeaders)
      .then((data) => {
        if (!active) return;
        setPost(data);
        setLoading(false);

        // Tăng lượt xem
        if (!viewIncremented.current && data?.id) {
          viewIncremented.current = true;
          communityApi.incrementView(data.id).catch(() => {});
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoading(false);
        setErrorStatus(err.status || 500);
        setErrorMessage(err.message || 'Không thể tải bài viết');
      });

    return () => {
      active = false;
    };
  }, [slug, currentUser]);

  // Cập nhật SEO Head & JSON-LD Article
  React.useEffect(() => {
    if (!post) return;

    const previousTitle = document.title;
    document.title = `${post.title} — ${COMMUNITY_CONFIG.PAGE_TITLE}`;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    const oldDesc = metaDesc?.getAttribute('content') || '';
    if (metaDesc) {
      metaDesc.setAttribute('content', post.excerpt || post.title);
    }

    // Canonical
    const fullUrl = window.location.href;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // OpenGraph Tags
    const setOgTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setOgTag('og:title', post.title);
    setOgTag('og:description', post.excerpt || post.title);
    setOgTag('og:url', fullUrl);
    setOgTag('og:type', 'article');
    if (post.coverImage) setOgTag('og:image', post.coverImage);

    // JSON-LD Article Schema
    const jsonLdId = 'community-post-jsonld';
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = jsonLdId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': post.kind === 'review' ? 'Review' : 'Article',
      headline: post.title,
      description: post.excerpt,
      image: post.coverImage ? [post.coverImage] : [],
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt || post.createdAt,
      author: {
        '@type': 'Person',
        name: post.authorName,
      },
      publisher: {
        '@type': 'Organization',
        name: 'GoReady',
        logo: {
          '@type': 'ImageObject',
          url: 'https://goready.vn/logo.png',
        },
      },
      ...(post.kind === 'review' && post.rating
        ? {
            reviewRating: {
              '@type': 'Rating',
              ratingValue: post.rating,
              bestRating: 5,
            },
          }
        : {}),
    };

    scriptTag.textContent = JSON.stringify(schemaData);

    return () => {
      document.title = previousTitle;
      if (metaDesc) metaDesc.setAttribute('content', oldDesc);
      const tag = document.getElementById(jsonLdId);
      if (tag) tag.remove();
    };
  }, [post]);

  // Tìm tour liên kết nếu bài viết có tourId
  const attachedTour = React.useMemo(() => {
    if (!post?.tourId) return null;
    return tours.find((t) => t.id === post.tourId || t.code === post.tourId || t.slug === post.tourId) || null;
  }, [post?.tourId, tours]);

  // Trạng thái Loading
  if (loading) {
    return (
      <main className="container-px mx-auto max-w-5xl py-10 animate-pulse">
        <div className="mb-6 h-6 w-36 rounded-full bg-slate-200" />
        <div className="h-10 w-3/4 rounded-xl bg-slate-200" />
        <div className="mt-4 flex gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-100" />
          </div>
        </div>
        <div className="mt-8 aspect-[16/9] w-full rounded-2xl bg-slate-200" />
        <div className="mt-8 space-y-4">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-4/6 rounded bg-slate-200" />
        </div>
      </main>
    );
  }

  // Trạng thái Lỗi / 404
  if (errorStatus || !post) {
    return (
      <main className="container-px mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-3xl">
          🔍
        </div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {errorStatus === 404 ? 'Không tìm thấy bài viết' : 'Đã có lỗi xảy ra'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {errorMessage || 'Bài viết không tồn tại, đã bị gỡ bỏ hoặc đang chờ ban quản trị phê duyệt.'}
        </p>
        <button
          onClick={onBackToFeed}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-soft transition hover:bg-primary-600"
        >
          ← Quay lại Cộng đồng
        </button>
      </main>
    );
  }

  const groupConfig = COMMUNITY_CONFIG.GROUPS.find((g) => g.id === post.group) || {
    id: post.group,
    name: 'Cộng đồng',
    icon: '🧭',
    color: 'bg-slate-100 text-slate-700',
  };

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date(post.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

  return (
    <main className="container-px mx-auto max-w-6xl py-8 sm:py-12">
      {/* Nút Quay lại Feed */}
      <button
        onClick={onBackToFeed}
        className="group mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
      >
        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Tất cả bài viết cộng đồng
      </button>

      {/* Layout Grid: Có Tour (70% / 30% sticky) hoặc Không có Tour (1 cột căn giữa) */}
      <div className={`grid grid-cols-1 gap-8 lg:gap-12 ${attachedTour ? 'lg:grid-cols-[1fr_340px]' : 'max-w-3xl mx-auto'}`}>
        {/* CỘT NỘI DUNG CHÍNH (70% khi có tour, hoặc 1 cột căn giữa) */}
        <article className="min-w-0">
          {/* Header bài viết */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${groupConfig.color}`}>
                <span>{groupConfig.icon}</span> {groupConfig.name}
              </span>

              {post.destination && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <svg className="h-3.5 w-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {post.destination}
                </span>
              )}

              {post.kind === 'review' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  <span className="flex items-center text-amber-500">
                    {Array.from({ length: post.rating || 5 }).map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </span>
                  <span>Đánh giá · Verified Tour</span>
                </span>
              )}

              {post.isPinned && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                  📌 Được ghim
                </span>
              )}
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {post.title}
            </h1>

            {/* Thông tin tác giả + ngày đăng */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-200 overflow-hidden ring-2 ring-primary/20">
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary text-sm font-bold text-white">
                      {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{post.authorName}</span>
                    {post.isOfficial && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                        GoReady Chính thức
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Đăng ngày {formattedDate}</span>
                    <span>·</span>
                    <span>{post.viewsCount || 0} lượt xem</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Ảnh bìa bài viết */}
          {post.coverImage && (
            <div className="my-6 overflow-hidden rounded-2xl shadow-sm">
              <img
                src={post.coverImage}
                alt={post.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          )}

          {/* Nội dung chi tiết (HTML sanitized) */}
          <div
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm sm:text-base prose-headings:font-heading prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-a:text-primary prose-img:rounded-2xl prose-img:shadow-sm"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Gallery hình ảnh đính kèm (nếu có media) */}
          {post.media && post.media.length > 0 && (
            <div className="my-8">
              <h4 className="mb-3 text-sm font-bold text-slate-900">Hình ảnh trải nghiệm:</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {post.media.map((m) => (
                  <div key={m.id} className="overflow-hidden rounded-xl bg-slate-100 aspect-[4/3]">
                    <img
                      src={m.url}
                      alt={m.alt || post.title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Thanh Thích / Lưu / Chia sẻ / Báo cáo */}
          <CommunityShareBar
            post={post}
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onOpenReport={() => setReportTarget({ type: 'post', id: post.id, title: post.title })}
            onPostUpdated={(patch) => setPost((prev) => (prev ? { ...prev, ...patch } : null))}
          />

          {/* KHỐI TOUR TRÊN MOBILE (variant="inline"): đúng 1 card ở cuối bài, trước khung bình luận */}
          {attachedTour && (
            <div className="block lg:hidden">
              <CommunityTourCard
                tour={attachedTour}
                onOpenTour={onOpenTour}
                variant="inline"
              />
            </div>
          )}

          {/* Khung Bình luận 2 cấp */}
          <CommunityComments
            postId={post.id}
            authorId={post.authorId}
            currentUser={currentUser}
            onOpenLogin={onOpenLogin}
            onReportComment={(commentId, commentContent) =>
              setReportTarget({ type: 'comment', id: commentId, title: commentContent })
            }
            commentsCount={post.commentsCount || 0}
            onCommentCountChange={(newCount) =>
              setPost((prev) => (prev ? { ...prev, commentsCount: newCount } : null))
            }
          />
        </article>

        {/* SIDEBAR STICKY KHỐI TOUR TRÊN DESKTOP (30% chiều rộng) */}
        {attachedTour && (
          <div className="hidden lg:block">
            <CommunityTourCard
              tour={attachedTour}
              onOpenTour={onOpenTour}
              variant="sidebar"
            />
          </div>
        )}
      </div>

      {/* Modal Báo cáo vi phạm */}
      {reportTarget && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
        />
      )}
    </main>
  );
};

export default CommunityPostDetailPage;

