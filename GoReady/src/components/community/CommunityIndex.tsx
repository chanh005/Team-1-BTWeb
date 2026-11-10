import React from 'react';
import type { Tour } from '../../types';
import { useCommunityRoute } from '../../hooks/useCommunityRoute';
import { CommunityFeedPage } from './CommunityFeedPage';
import { CommunityPostDetailPage } from './CommunityPostDetailPage';
import { CommunityCreateEditPostPage } from './CommunityCreateEditPostPage';
import { CommunityMyPostsPage } from './CommunityMyPostsPage';

interface CommunityIndexProps {
  tours: Tour[];
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  onOpenTour?: (tourId: string) => void;
}

export const CommunityIndex: React.FC<CommunityIndexProps> = ({
  tours,
  currentUser,
  onOpenLogin,
  onOpenTour,
}) => {
  const route = useCommunityRoute();

  // 1. Tạo bài mới: #/cong-dong/viet-bai
  if (route.viewMode === 'create') {
    return (
      <CommunityCreateEditPostPage
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onComplete={() => route.pushMyPosts()}
        onCancel={() => route.pushFeed()}
      />
    );
  }

  // 2. Chỉnh sửa bài viết: #/cong-dong/chinh-sua/:id
  if (route.viewMode === 'edit' && route.editPostId) {
    return (
      <CommunityCreateEditPostPage
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        editPostId={route.editPostId}
        onComplete={() => route.pushMyPosts()}
        onCancel={() => route.pushMyPosts()}
      />
    );
  }

  // 3. Quản lý bài của tôi: #/cong-dong/bai-cua-toi
  if (route.viewMode === 'my-posts') {
    return (
      <CommunityMyPostsPage
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onEditPost={(postId) => route.pushEdit(postId)}
        onCreateNewPost={() => route.pushCreate()}
        onViewPost={(slug) => route.pushDetail(slug)}
        onBackToFeed={() => route.pushFeed()}
      />
    );
  }

  // 4. Chi tiết bài viết: #/cong-dong/:slug
  if (route.viewMode === 'detail' && route.slug) {
    return (
      <CommunityPostDetailPage
        slug={route.slug}
        tours={tours}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenTour={onOpenTour}
        onBackToFeed={() => route.pushFeed()}
      />
    );
  }

  // 5. Danh sách bài viết Feed: #/cong-dong
  return (
    <CommunityFeedPage
      currentUser={currentUser}
      onOpenLogin={onOpenLogin}
      onSelectPost={(slug) => route.pushDetail(slug)}
      onOpenCreatePost={() => route.pushCreate()}
    />
  );
};

export default CommunityIndex;
