import React from 'react';
import type { CommunityPost, CommunityPostGroup } from '../../types/community';
import { COMMUNITY_CONFIG } from '../../config/community';
import { communityApi } from '../../services/communityApi';
import { CommunityFeedCard } from './CommunityFeedCard';
import { useCommunityRoute } from '../../hooks/useCommunityRoute';

interface CommunityFeedPageProps {
  currentUser: { id: string; email: string; name: string } | null;
  onOpenLogin: () => void;
  onSelectPost: (slug: string) => void;
  onOpenCreatePost?: () => void;
}

export const CommunityFeedPage: React.FC<CommunityFeedPageProps> = ({
  currentUser,
  onOpenLogin,
  onSelectPost,
  onOpenCreatePost,
}) => {
  const route = useCommunityRoute();

  // Local state đồng bộ với query URL
  const [posts, setPosts] = React.useState<CommunityPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [totalPosts, setTotalPosts] = React.useState(0);

  // Bộ lọc hiện tại từ URL
  const selectedGroup = route.group;
  const selectedDestination = route.destination;
  const selectedKind = route.kind;
  const selectedSort = route.sort;

  // Tải danh sách bài viết khi filter thay đổi
  const fetchPosts = React.useCallback(
    async (pageToLoad: number, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const authHeaders = currentUser
          ? {
              userId: currentUser.id,
              userEmail: currentUser.email,
              userName: currentUser.name,
            }
          : undefined;

        const res = await communityApi.getPosts(
          {
            group: selectedGroup,
            destination: selectedDestination,
            kind: selectedKind,
            sort: selectedSort,
            page: pageToLoad,
            limit: 9,
          },
          authHeaders
        );

        if (append) {
          setPosts((prev) => [...prev, ...res.items]);
        } else {
          setPosts(res.items);
        }

        setCurrentPage(res.pagination.page);
        setHasMore(res.pagination.hasMore);
        setTotalPosts(res.pagination.total);
      } catch (err) {
        console.error('Lỗi khi tải bài viết cộng đồng:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedGroup, selectedDestination, selectedKind, selectedSort, currentUser]
  );

  React.useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  // Cập nhật URL khi đổi tab Nhóm
  const handleGroupChange = (group: CommunityPostGroup | 'all') => {
    route.replaceParams({
      group,
      destination: selectedDestination,
      kind: selectedKind,
      sort: selectedSort,
      page: 1,
    });
  };

  // Cập nhật URL khi đổi Điểm đến
  const handleDestinationChange = (destination: string) => {
    route.replaceParams({
      group: selectedGroup,
      destination,
      kind: selectedKind,
      sort: selectedSort,
      page: 1,
    });
  };

  // Cập nhật URL khi đổi Loại bài
  const handleKindChange = (kind: 'all' | 'review' | 'post') => {
    route.replaceParams({
      group: selectedGroup,
      destination: selectedDestination,
      kind,
      sort: selectedSort,
      page: 1,
    });
  };

  // Cập nhật URL khi đổi Sắp xếp
  const handleSortChange = (sort: 'newest' | 'popular') => {
    route.replaceParams({
      group: selectedGroup,
      destination: selectedDestination,
      kind: selectedKind,
      sort,
      page: 1,
    });
  };

  // Nút "Xem thêm"
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(currentPage + 1, true);
    }
  };

  // Nút "Viết bài"
  const handleCreateClick = () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }
    if (onOpenCreatePost) {
      onOpenCreatePost();
    } else {
      alert('Chức năng soạn thảo bài viết sẽ sẵn sàng trong giây lát!');
    }
  };

  return (
    <main className="container-px mx-auto py-8 sm:py-12">
      {/* Banner Giới thiệu Cộng đồng & Nút Viết bài */}
      <section className="mb-10 rounded-3xl bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6 sm:p-10 text-white shadow-card relative overflow-hidden">
        {/* Họa tiết trang trí */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-1/4 top-0 h-40 w-40 rounded-full bg-primary-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-primary-200 backdrop-blur-md">
              <span>✨</span> {COMMUNITY_CONFIG.MENU_LABEL} Du Lịch
            </span>
            <h1 className="mt-3 font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {COMMUNITY_CONFIG.PAGE_TITLE}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-primary-100/90 leading-relaxed">
              {COMMUNITY_CONFIG.PAGE_SUBTITLE}
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleCreateClick}
              className="group flex items-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 font-heading text-sm font-bold text-primary-800 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-primary-50 hover:shadow-2xl active:scale-95"
            >
              <span className="text-base">✍️</span>
              <span>Viết bài chia sẻ</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Tabs Nhóm bài viết */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleGroupChange('all')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            selectedGroup === 'all'
              ? 'bg-primary text-white shadow-soft'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/40 hover:text-primary'
          }`}
        >
          <span>🌟</span>
          <span>Tất cả nhóm</span>
        </button>

        {COMMUNITY_CONFIG.GROUPS.map((g) => {
          const isActive = selectedGroup === g.id;
          return (
            <button
              key={g.id}
              onClick={() => handleGroupChange(g.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/40 hover:text-primary'
              }`}
            >
              <span>{g.icon}</span>
              <span>{g.name}</span>
            </button>
          );
        })}
      </div>

      {/* Thanh Bộ lọc chi tiết: Loại bài + Điểm đến + Sắp xếp */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
        {/* Bộ lọc Loại: Tất cả / Đánh giá / Bài viết */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleKindChange('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedKind === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => handleKindChange('review')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedKind === 'review' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            ⭐ Đánh giá · Review Tour
          </button>
          <button
            onClick={() => handleKindChange('post')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              selectedKind === 'post' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-primary-50 hover:text-primary'
            }`}
          >
            📝 Bài chia sẻ
          </button>
        </div>

        {/* Điểm đến + Sắp xếp */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Điểm đến */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Điểm đến:</span>
            <select
              value={selectedDestination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-primary focus:outline-none"
            >
              <option value="all">Tất cả địa điểm</option>
              {COMMUNITY_CONFIG.DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Sắp xếp:</span>
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value as 'newest' | 'popular')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-primary focus:outline-none"
            >
              <option value="newest">Mới nhất</option>
              <option value="popular">Nổi bật nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danh sách bài viết */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-soft animate-pulse">
              <div className="aspect-[16/10] w-full rounded-xl bg-slate-200" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-5/6 rounded bg-slate-100" />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                </div>
                <div className="h-3 w-12 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="my-16 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
            📭
          </div>
          <h3 className="font-heading text-lg font-bold text-slate-800">
            Chưa có bài viết nào phù hợp với bộ lọc
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Hãy thử chọn nhóm hoặc điểm đến khác, hoặc trở thành người đầu tiên chia sẻ kinh nghiệm cho điểm đến này!
          </p>
          <button
            onClick={() => {
              route.replaceParams({ group: 'all', destination: 'all', kind: 'all', sort: 'newest', page: 1 });
            }}
            className="mt-5 rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <CommunityFeedCard
                key={post.id}
                post={post}
                onSelectPost={onSelectPost}
              />
            ))}
          </div>

          {/* Nút Xem thêm */}
          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3 text-xs font-bold text-slate-800 shadow-soft transition-all hover:border-primary hover:text-primary hover:shadow-card disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang tải thêm bài viết...
                  </>
                ) : (
                  <>
                    Xem thêm bài viết ({posts.length}/{totalPosts})
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default CommunityFeedPage;

