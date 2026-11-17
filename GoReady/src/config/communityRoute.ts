// Đường dẫn của trang Cộng đồng — muốn đổi link chỉ cần sửa dòng COMMUNITY_HASH.
export const COMMUNITY_HASH = '#/cong-dong-du-lich';

export const isCommunityHash = (hash: string): boolean => hash.startsWith(COMMUNITY_HASH);

export type CommunitySectionId = 'feed' | 'review' | 'soan-bai' | 'ho-so';

export interface CommunitySection {
  id: CommunitySectionId;
  label: string;
  icon: string;
  description: string;
  /** Phần đuôi đường dẫn; '' = mục mặc định (nằm ngay tại COMMUNITY_HASH) */
  path: string;
}

export const COMMUNITY_SECTIONS: CommunitySection[] = [
  { id: 'feed', label: 'Feed chính', icon: '🏠', description: 'Khám phá bài chia sẻ của cộng đồng', path: '' },
  { id: 'review', label: 'Bài review chi tiết', icon: '📖', description: 'Đọc review và xem tour liên quan', path: '/bai-review' },
  { id: 'soan-bai', label: 'Soạn thảo bài viết', icon: '✍️', description: 'Chia sẻ trải nghiệm chuyến đi của bạn', path: '/soan-bai' },
  { id: 'ho-so', label: 'Hồ sơ du lịch', icon: '🧭', description: 'Hành trình và GoPoint của bạn', path: '/ho-so' },
];

export const communitySectionHref = (id: CommunitySectionId): string => {
  const section = COMMUNITY_SECTIONS.find((s) => s.id === id);
  return COMMUNITY_HASH + (section?.path ?? '');
};

/** Đọc mục đang mở từ hash; không khớp mục nào thì về Bảng tin. */
export const readCommunitySection = (hash: string): CommunitySectionId => {
  const rest = hash.slice(COMMUNITY_HASH.length).split('?')[0];
  const found = COMMUNITY_SECTIONS.find((s) => s.path !== '' && (rest === s.path || rest.startsWith(s.path + '/')));
  return found ? found.id : 'feed';
};
