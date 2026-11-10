import React from 'react';
import type { CommunityPost } from '../../types/community';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityHref } from '../../hooks/useCommunityRoute';

interface CommunityFeedCardProps {
  post: CommunityPost;
  onSelectPost?: (slug: string) => void;
}

export const CommunityFeedCard: React.FC<CommunityFeedCardProps> = ({
  post,
  onSelectPost,
}) => {
  const groupConfig = COMMUNITY_CONFIG.GROUPS.find((g) => g.id === post.group) || {
    id: post.group,
    name: 'Cộng đồng',
    icon: '🧭',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Nếu click vào nút hay link khác thì không kích hoạt chuyển bài
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (onSelectPost) {
      onSelectPost(post.slug);
    } else {
      window.location.hash = communityHref({ slug: post.slug });
    }
  };

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(post.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card cursor-pointer"
    >
      {/* Ảnh bìa + Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={post.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'}
          alt={post.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        {/* Nhãn Ghim */}
        {post.isPinned && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <span>📌</span> Được ghim
          </div>
        )}

        {/* Nhãn Nhóm & Điểm đến */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${groupConfig.color} bg-opacity-90`}>
            <span>{groupConfig.icon}</span> {groupConfig.name}
          </span>
          {post.destination && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md">
              <svg className="h-3 w-3 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {post.destination}
            </span>
          )}
        </div>
      </div>

      {/* Nội dung Card */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Nhãn Đánh giá / Verified Tour */}
          {post.kind === 'review' && (
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <span className="flex items-center text-amber-500">
                {Array.from({ length: post.rating || 5 }).map((_, i) => (
                  <svg key={i} className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span>Đánh giá · Verified Tour</span>
            </div>
          )}

          {/* Tiêu đề */}
          <h3 className="font-heading text-base font-bold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          {/* Đoạn trích dẫn */}
          <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
            {post.excerpt}
          </p>
        </div>

        {/* Footer của Card: Tác giả + Thống kê tương tác */}
        <div className="mt-5 border-t border-slate-100 pt-3.5 flex items-center justify-between">
          {/* Tác giả */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-100">
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt={post.authorName} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-primary/10 text-xs font-bold text-primary">
                  {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-slate-700">{post.authorName}</span>
                {post.isOfficial && (
                  <span className="shrink-0 rounded-full bg-primary-100 px-1.5 py-0.2 text-[10px] font-bold text-primary-700">
                    GoReady Chính thức
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block">{formattedDate}</span>
            </div>
          </div>

          {/* Chỉ số Thích / Bình luận / Lượt xem */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
              <svg className="h-4 w-4" fill={post.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post.likesCount || 0}</span>
            </span>

            <span className="flex items-center gap-1 hover:text-primary transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.commentsCount || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CommunityFeedCard;

