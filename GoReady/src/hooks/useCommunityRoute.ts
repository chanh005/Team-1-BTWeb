import React from 'react';
import type { CommunityPostGroup } from '../types/community';

export interface CommunityRouteParams {
  slug: string | null;
  group: CommunityPostGroup | 'all';
  destination: string;
  kind: 'all' | 'review' | 'post';
  sort: 'newest' | 'popular';
  page: number;
}

const COMMUNITY_DETAIL_HASH = /^#\/cong-dong\/([^/?#]+)/;
const COMMUNITY_FEED_HASH = /^#\/cong-dong(?:\?(.*))?$/;
const LEGACY_NEWS_HASH = /^#\/news(?:\?(.*))?$/;

export function readCommunityParams(): CommunityRouteParams {
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';

  // Redirect legacy /news -> /cong-dong
  if (pathname === '/news' || hash.startsWith('#/news')) {
    const search = window.location.search || '';
    window.history.replaceState(null, '', `#/cong-dong${search}`);
  }

  // Check detail slug
  const detailMatch = hash.match(COMMUNITY_DETAIL_HASH);
  if (detailMatch) {
    return {
      slug: decodeURIComponent(detailMatch[1]),
      group: 'all',
      destination: 'all',
      kind: 'all',
      sort: 'newest',
      page: 1,
    };
  }

  // Check pathname detail: /cong-dong/slug
  const pathDetailMatch = pathname.match(/^\/cong-dong\/([^/?#]+)/);
  if (pathDetailMatch && !pathname.endsWith('.html') && !pathname.includes('.')) {
    return {
      slug: decodeURIComponent(pathDetailMatch[1]),
      group: 'all',
      destination: 'all',
      kind: 'all',
      sort: 'newest',
      page: 1,
    };
  }

  // Check feed query params
  const feedMatch = hash.match(COMMUNITY_FEED_HASH);
  const search = feedMatch ? feedMatch[1] ?? '' : (pathname === '/cong-dong' ? window.location.search.slice(1) : '');
  const query = new URLSearchParams(search);

  const group = (query.get('group') as CommunityPostGroup) || 'all';
  const destination = query.get('destination') || 'all';
  const kind = (query.get('kind') as 'all' | 'review' | 'post') || 'all';
  const sort = (query.get('sort') as 'newest' | 'popular') || 'newest';
  const page = parseInt(query.get('page') || '1', 10) || 1;

  return {
    slug: null,
    group: ['all', 'family', 'backpack', 'deal', 'student'].includes(group) ? group : 'all',
    destination: destination.trim(),
    kind: ['all', 'review', 'post'].includes(kind) ? kind : 'all',
    sort: ['newest', 'popular'].includes(sort) ? sort : 'newest',
    page: page > 0 ? page : 1,
  };
}

export const communityHref = (params: Partial<CommunityRouteParams> = {}): string => {
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
    replaceParams: replaceCommunityParams,
  };
}

