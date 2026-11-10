import React from 'react';
import type { CommunityPost } from '../../types/community';
import { communityApi } from '../../services/communityApi';

interface CommunityShareBarProps {
  post: CommunityPost;
  currentUser: { id: string; email: string; name: string } | null;
  onOpenLogin: () => void;
  onOpenReport: () => void;
  onPostUpdated?: (patch: Partial<CommunityPost>) => void;
}

export const CommunityShareBar: React.FC<CommunityShareBarProps> = ({
  post,
  currentUser,
  onOpenLogin,
  onOpenReport,
  onPostUpdated,
}) => {
  const [liked, setLiked] = React.useState(!!post.isLiked);
  const [likesCount, setLikesCount] = React.useState(post.likesCount || 0);
  const [saved, setSaved] = React.useState(!!post.isSaved);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLiked(!!post.isLiked);
    setLikesCount(post.likesCount || 0);
    setSaved(!!post.isSaved);
  }, [post.id, post.isLiked, post.likesCount, post.isSaved]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Thích bài viết (Optimistic update + rollback)
  const handleToggleLike = async () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const previousLiked = liked;
    const previousCount = likesCount;

    // Optimistic
    const nextLiked = !liked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLiked(nextLiked);
    setLikesCount(nextCount);
    if (onPostUpdated) onPostUpdated({ isLiked: nextLiked, likesCount: nextCount });

    try {
      const res = await communityApi.toggleLike(post.id, {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
      });
      setLiked(res.liked);
      setLikesCount(res.likesCount);
      if (onPostUpdated) onPostUpdated({ isLiked: res.liked, likesCount: res.likesCount });
    } catch (err: any) {
      // Rollback
      setLiked(previousLiked);
      setLikesCount(previousCount);
      if (onPostUpdated) onPostUpdated({ isLiked: previousLiked, likesCount: previousCount });
      showToast(err.message || 'Không thể thực hiện, vui lòng thử lại');
    }
  };

  // 2. Lưu bài viết (Optimistic update + rollback)
  const handleToggleSave = async () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const previousSaved = saved;

    // Optimistic
    const nextSaved = !saved;
    setSaved(nextSaved);
    if (onPostUpdated) onPostUpdated({ isSaved: nextSaved });

    try {
      const res = await communityApi.toggleSave(post.id, {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
      });
      setSaved(res.saved);
      if (onPostUpdated) onPostUpdated({ isSaved: res.saved });
      showToast(res.saved ? 'Đã lưu bài viết vào mục yêu thích!' : 'Đã bỏ lưu bài viết');
    } catch (err: any) {
      // Rollback
      setSaved(previousSaved);
      if (onPostUpdated) onPostUpdated({ isSaved: previousSaved });
      showToast(err.message || 'Không thể lưu bài viết, vui lòng thử lại');
    }
  };

  // 3. Chia sẻ bài viết (Web Share API, fallback copy link)
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User aborted share or share failed -> continue to clipboard fallback
      }
    }

    // Fallback copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Đã sao chép liên kết vào bộ nhớ tạm!');
    } catch (err) {
      showToast('Không thể sao chép liên kết, vui lòng sao chép thủ công trên thanh địa chỉ');
    }
  };

  return (
    <div className="relative my-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3.5 sm:py-4">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur animate-fade-in z-20">
          {toastMessage}
        </div>
      )}

      {/* Nhóm Thích & Bình luận */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nút Thích */}
        <button
          onClick={handleToggleLike}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
            liked
              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
          }`}
          title={liked ? 'Bỏ thích' : 'Thích bài viết'}
        >
          <svg className={`h-4 w-4 transition-transform ${liked ? 'scale-110' : ''}`} fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{liked ? 'Đã thích' : 'Thích'} ({likesCount})</span>
        </button>

        {/* Nút Lưu */}
        <button
          onClick={handleToggleSave}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
            saved
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
          }`}
          title={saved ? 'Bỏ lưu' : 'Lưu bài viết'}
        >
          <svg className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>{saved ? 'Đã lưu' : 'Lưu bài'}</span>
        </button>
      </div>

      {/* Nhóm Chia sẻ & Báo cáo */}
      <div className="flex items-center gap-2">
        {/* Nút Chia sẻ */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary transition-colors"
          title="Chia sẻ liên kết"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>

        {/* Nút Báo cáo */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1 rounded-full p-2 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          title="Báo cáo bài viết này"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <span className="hidden sm:inline">Báo cáo</span>
        </button>
      </div>
    </div>
  );
};

export default CommunityShareBar;

