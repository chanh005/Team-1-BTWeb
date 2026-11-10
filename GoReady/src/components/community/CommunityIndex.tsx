import React from 'react';
import type { Tour } from '../../types';
import { useCommunityRoute } from '../../hooks/useCommunityRoute';
import { CommunityFeedPage } from './CommunityFeedPage';
import { CommunityPostDetailPage } from './CommunityPostDetailPage';

interface CommunityIndexProps {
  tours: Tour[];
  currentUser: { id: string; email: string; name: string; role?: string } | null;
  onOpenLogin: () => void;
  onOpenTour?: (tourId: string) => void;
  onOpenCreatePost?: () => void;
}

export const CommunityIndex: React.FC<CommunityIndexProps> = ({
  tours,
  currentUser,
  onOpenLogin,
  onOpenTour,
  onOpenCreatePost,
}) => {
  const route = useCommunityRoute();

  if (route.slug) {
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

  return (
    <CommunityFeedPage
      currentUser={currentUser}
      onOpenLogin={onOpenLogin}
      onSelectPost={(slug) => route.pushDetail(slug)}
      onOpenCreatePost={onOpenCreatePost}
    />
  );
};

export default CommunityIndex;

