import React from 'react';
import type { CommunityPostGroup } from '../types/community';

export type CommunityViewMode = 'feed' | 'detail' | 'create' | 'my-posts' | 'edit';

export interface CommunityRouteParams {
  viewMode: CommunityViewMode;
  slug: string | null;
  editPostId: string | null;
  group: CommunityPostGroup | 'all';
  destination: string;
  kind: 'all' | 'review' | 'post';
  sort: 'newest' | 'popular';
  page: number;
}

const COMMUNITY_DETAIL_HASH = /^#\/cong-dong\/([^/?#]+)/;
const COMMUNITY_FEED_HASH = /^#\/cong-dong(?:\?(.*))?$/;

export function readCommunityParams(): CommunityRouteParams {
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';

  // Redirect legacy /news -> /cong-dong
  if (pathname === '/news' || hash.startsWith('#/news')) {
    const search = window.location.search || '';
    window.history.replaceState(null, '', `#/cong-dong${search}`);
  }

  // 1. Viết bài: #/cong-dong/viet-bai
  if (hash === '#/cong-dong/viet-bai' || pathname === '/cong-dong/viet-bai') {
    return {
      viewMode: 'create',
      slug: null,
      editPostId: null,
      group: 'all',
      destination: 'all',
      kind: 'all',
      sort: 'newest',
      page: 1,
    };
  }

  // 2. Bài của tôi: #/cong-dong/bai-cua-toi
  if (hash === '#/cong-dong/bai-cua-toi' || pathname === '/cong-dong/bai-cua-toi') {
    return {
      viewMode: 'my-posts',
      slug: null,
      editPostId: null,
      group: 'all',
      destination: 'all',
      kind: 'all',
      sort: 'newest',
      page: 1,
    };
  }

  // 3. Sửa bài: #/cong-dong/chinh-sua/:id
  const editMatch = hash.match(/^#\/cong-dong\/chinh-sua\/([^/?#]+)/);
  if (editMatch) {
    return {
      viewMode: 'edit',
      slug: null,
      editPostId: decodeURIComponent(editMatch[1]),
      group: 'all',
      destination: 'all',
      kind: 'all',
      sort: 'newest',
      page: 1,
    };
  }

  // 4. Chi tiết bài viết: #/cong-dong/:slug (không phải viet-bai hoặc bai-cua-toi)
  const detailMatch = hash.match(COMMUNITY_DETAIL_HASH);
  if (detailMatch) {
    const matchedSlug = decodeURIComponent(detailMatch[1]);
    if (matchedSlug !== 'viet-bai' && matchedSlug !== 'bai-cua-toi') {
      return {
        viewMode: 'detail',
        slug: matchedSlug,
        editPostId: null,
        group: 'all',
        destination: 'all',
        kind: 'all',
        sort: 'newest',
        page: 1,
      };
    }
  }

  // 5. Chi tiết qua pathname: /cong-dong/:slug
  const pathDetailMatch = pathname.match(/^\/cong-dong\/([^/?#]+)/);
  if (pathDetailMatch && !pathname.endsWith('.html') && !pathname.includes('.')) {
    const matchedSlug = decodeURIComponent(pathDetailMatch[1]);
    if (matchedSlug !== 'viet-bai' && matchedSlug !== 'bai-cua-toi') {
      return {
        viewMode: 'detail',
        slug: matchedSlug,
        editPostId: null,
        group: 'all',
        destination: 'all',
        kind: 'all',
        sort: 'newest',
        page: 1,
      };
    }
  }

  // 6. Feed với các tham số lọc: #/cong-dong?...
  const feedMatch = hash.match(COMMUNITY_FEED_HASH);
  const search = feedMatch ? feedMatch[1] ?? '' : (pathname === '/cong-dong' ? window.location.search.slice(1) : '');
  const query = new URLSearchParams(search);

  const group = (query.get('group') as CommunityPostGroup) || 'all';
  const destination = query.get('destination') || 'all';
  const kind = (query.get('kind') as 'all' | 'review' | 'post') || 'all';
  const sort = (query.get('sort') as 'newest' | 'popular') || 'newest';
  const page = parseInt(query.get('page') || '1', 10) || 1;

  return {
    viewMode: 'feed',
    slug: null,
    editPostId: null,
    group: ['all', 'family', 'backpack', 'deal', 'student'].includes(group) ? group : 'all',
    destination: destination.trim(),
    kind: ['all', 'review', 'post'].includes(kind) ? kind : 'all',
    sort: ['newest', 'popular'].includes(sort) ? sort : 'newest',
    page: page > 0 ? page : 1,
  };
}

export const communityHref = (params: Partial<CommunityRouteParams> = {}): string => {
  if (params.viewMode === 'create') {
    return '#/cong-dong/viet-bai';
  }
  if (params.viewMode === 'my-posts') {
    return '#/cong-dong/bai-cua-toi';
  }
  if (params.viewMode === 'edit' && params.editPostId) {
    return `#/cong-dong/chinh-sua/${encodeURIComponent(params.editPostId)}`;
  }
  if (params.slug) {
    return `#/cong-dong/${encodeURIComponent(params.slug)}`;
  }

  const query = new URLSearchParams();
  if (params.group && params.group !== 'all') query.set('group', params.group);
  if (params.destination && params.destination !== 'all' && params.destination.trim()) {
    query.set('destination', params.destination.trim());
  }
  if (params.kind && params.kind !== 'all') query.set('kind', params.kind);
  if (params.sort && params.sort !== 'newest') query.set('sort', params.sort);
  if (params.page && params.page > 1) query.set('page', String(params.page));

  const text = query.toString();
  return text ? `#/cong-dong?${text}` : '#/cong-dong';
};

export function pushCommunityFeed(params: Partial<CommunityRouteParams> = {}) {
  window.location.hash = communityHref(params);
}

export function pushCommunityDetail(slug: string) {
  window.location.hash = communityHref({ slug });
}

export function pushCommunityCreate() {
  window.location.hash = '#/cong-dong/viet-bai';
}

export function pushCommunityMyPosts() {
  window.location.hash = '#/cong-dong/bai-cua-toi';
}

export function pushCommunityEdit(postId: string) {
  window.location.hash = `#/cong-dong/chinh-sua/${encodeURIComponent(postId)}`;
}

export function replaceCommunityParams(params: Partial<CommunityRouteParams>) {
  const href = communityHref(params);
  if (window.location.hash !== href) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search + href);
  }
}

export function useCommunityRoute() {
  const [params, setParams] = React.useState<CommunityRouteParams>(readCommunityParams);

  React.useEffect(() => {
    const handleSync = () => {
      setParams(readCommunityParams());
    };
    window.addEventListener('hashchange', handleSync);
    window.addEventListener('popstate', handleSync);
    return () => {
      window.removeEventListener('hashchange', handleSync);
      window.removeEventListener('popstate', handleSync);
    };
  }, []);

  return {
    ...params,
    pushFeed: pushCommunityFeed,
    pushDetail: pushCommunityDetail,
    pushCreate: pushCommunityCreate,
    pushMyPosts: pushCommunityMyPosts,
    pushEdit: pushCommunityEdit,
    replaceParams: replaceCommunityParams,
  };
}
