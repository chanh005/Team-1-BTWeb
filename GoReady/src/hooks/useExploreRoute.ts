import type { GroupSizeTag } from '../types';

/**
 * Route của trang Khám phá Tour (hash-based như #/tour/:id, không cần cấu hình server / GitHub Pages):
 *
 *   #/explore?destination=Đà Nẵng&dateFrom=2026-10-01&groupSize=Gia đình
 *
 * Mọi tham số đều tuỳ chọn; `#/explore` trần hiển thị tất cả tour.
 */
export interface ExploreParams {
  destination: string;
  dateFrom: string;
  groupSize: GroupSizeTag | 'all';
}

const EXPLORE_HASH = /^#\/explore(?:\?(.*))?$/;
const GROUP_SIZES: GroupSizeTag[] = ['Solo', 'Cặp đôi', 'Gia đình', 'Nhóm bạn'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tham số của hash hiện tại, hoặc null khi hash không phải route Khám phá. */
export const readExploreParams = (hash: string = window.location.hash): ExploreParams | null => {
  const match = hash.match(EXPLORE_HASH);
  if (!match) return null;
  const query = new URLSearchParams(match[1] ?? '');
  const groupSize = query.get('groupSize') as GroupSizeTag | null;
  const dateFrom = query.get('dateFrom') ?? '';
  return {
    destination: (query.get('destination') ?? '').trim(),
    dateFrom: DATE_RE.test(dateFrom) ? dateFrom : '',
    groupSize: groupSize && GROUP_SIZES.includes(groupSize) ? groupSize : 'all',
  };
};

export const exploreHref = (params: Partial<ExploreParams> = {}): string => {
  const query = new URLSearchParams();
  if (params.destination?.trim()) query.set('destination', params.destination.trim());
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.groupSize && params.groupSize !== 'all') query.set('groupSize', params.groupSize);
  const text = query.toString();
  return text ? `#/explore?${text}` : '#/explore';
};

/** Sang trang Khám phá: thêm một mục vào lịch sử để nút Back quay lại trang trước. */
export const pushExplore = (params: Partial<ExploreParams> = {}) => {
  window.location.hash = exploreHref(params);
};

/** Cập nhật URL của trang Khám phá theo bộ lọc đang áp dụng mà không thêm mục lịch sử. */
export const replaceExploreParams = (params: Partial<ExploreParams>) => {
  const href = exploreHref(params);
  if (window.location.hash !== href) window.history.replaceState(null, '', window.location.pathname + window.location.search + href);
};
