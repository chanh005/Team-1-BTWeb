import React from 'react';
import type { CommunityPost } from '../../types/community';
import { communityApi } from '../../services/communityApi';
import { communityHref } from '../../hooks/useCommunityRoute';

interface CommunityMyPostsPageProps {
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  onEditPost: (postId: string) => void;
  onCreateNewPost: () => void;
  onViewPost: (slug: string) => void;
  onBackToFeed: () => void;
}

export const CommunityMyPostsPage: React.FC<CommunityMyPostsPageProps> = ({
  currentUser,
  onOpenLogin,
  onEditPost,
  onCreateNewPost,
  onViewPost,
  onBackToFeed,
}) => {
  const [posts, setPosts] = React.useState<CommunityPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const loadMyPosts = React.useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await communityApi.getMyPosts({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        userRole: currentUser.role,
      });
      setPosts(data);
    } catch (err) {
      console.error('Không thể tải bài viết của tôi:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  if (!currentUser) {
    return (
      <main className="container-px mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-3xl">
          📂
        </div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">
          Vui lòng đăng nhập để quản lý bài viết
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Đăng nhập để theo dõi trạng thái các bài viết, bài đánh giá và chỉnh sửa nội dung của bạn.
        </p>
        <button
          onClick={onOpenLogin}
          className="mt-6 rounded-full bg-primary px-8 py-3 text-xs font-bold text-white shadow-card hover:bg-primary-600 transition"
        >
          Đăng nhập
        </button>
      </main>
    );
  }

  // Xóa bài viết
  const handleDelete = async (postId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    try {
      setActionLoadingId(postId);
      await communityApi.deletePost(postId, {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Không thể xóa bài viết');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gửi duyệt lại cho bài nháp hoặc bài bị từ chối
  const handleResubmit = async (post: CommunityPost) => {
    try {
      setActionLoadingId(post.id);
      await communityApi.updatePost(
        post.id,
        {
          submitForReview: true,
          status: 'pending',
        },
        {
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }
      );
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: 'pending', rejectReason: null } : p))
      );
      alert('Đã gửi bài viết tới Ban quản trị để phê duyệt!');
    } catch (err: any) {
      alert(err.message || 'Không thể gửi duyệt lại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const getStatusBadge = (post: CommunityPost) => {
    switch (post.status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            ✓ Đã đăng công khai
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            ⏳ Đang chờ duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            ✕ Bị từ chối
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            📝 Bản nháp
          </span>
        );
      case 'hidden':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
            👁️ Đã ẩn
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <main className="container-px mx-auto max-w-5xl py-8 sm:py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <button
            onClick={onBackToFeed}
            className="mb-2 text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            ← Về trang Cộng đồng
          </button>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            Bài viết của tôi ({posts.length})
          </h1>
        </div>

        <button
          onClick={onCreateNewPost}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-primary-600 transition"
        >
          <span>✍️</span>
          <span>Viết bài mới</span>
        </button>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'published', label: 'Đã đăng' },
          { id: 'pending', label: 'Chờ duyệt' },
          { id: 'draft', label: 'Bản nháp' },
          { id: 'rejected', label: 'Bị từ chối' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filterStatus === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách bài viết */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-xs">
            📄
          </div>
          <h3 className="font-heading text-base font-bold text-slate-800">
            Không có bài viết nào trong danh mục này
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Hãy bắt đầu chia sẻ câu chuyện du lịch đầu tiên của bạn cùng GoReady!
          </p>
          <button
            onClick={onCreateNewPost}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow hover:bg-primary-600 transition"
          >
            Viết bài ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-card"
            >
              <div className="flex gap-4 min-w-0 flex-1">
                <div className="h-20 w-24 sm:h-24 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={post.coverImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {getStatusBadge(post)}
                    <span className="text-[11px] font-medium text-slate-500">
                      {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    {post.kind === 'review' && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                        ⭐ Review {post.rating}★
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => post.status === 'published' && onViewPost(post.slug)}
                    className={`font-heading text-sm sm:text-base font-bold text-slate-900 line-clamp-1 ${
                      post.status === 'published' ? 'hover:text-primary cursor-pointer' : ''
                    }`}
                  >
                    {post.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                    {post.excerpt}
                  </p>

                  {/* Lý do từ chối nếu có */}
                  {post.status === 'rejected' && post.rejectReason && (
                    <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 border border-rose-100">
                      <strong>Lý do từ chối:</strong> {post.rejectReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Nút thao tác */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  {post.status === 'published' && (
                    <button
                      onClick={() => onViewPost(post.slug)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition"
                    >
                      Xem bài
                    </button>
                  )}

                  <button
                    onClick={() => onEditPost(post.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition"
                  >
                    Sửa
                  </button>

                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={actionLoadingId === post.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>

                {/* Nút gửi duyệt lại cho bài nháp / từ chối */}
                {(post.status === 'draft' || post.status === 'rejected') && (
                  <button
                    onClick={() => handleResubmit(post)}
                    disabled={actionLoadingId === post.id}
                    className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-600 transition disabled:opacity-50"
                  >
                    {actionLoadingId === post.id ? 'Đang gửi...' : 'Gửi duyệt lại'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default CommunityMyPostsPage;

