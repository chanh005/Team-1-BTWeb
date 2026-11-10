// ==========================================================================
// GoReady — Community (Cộng đồng) Type Definitions
// ==========================================================================

export type CommunityPostKind = 'review' | 'post';

export type CommunityPostGroup = 'family' | 'backpack' | 'deal' | 'student';

export type CommunityPostStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'hidden';

export type CommunityCommentStatus = 'visible' | 'hidden';

export type CommunityReportTarget = 'post' | 'comment';

export type CommunityReportStatus = 'open' | 'resolved' | 'dismissed';

export interface CommunityPostMedia {
  id: string;
  postId: string;
  url: string;
  order: number;
  alt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorEmail?: string;
  slug: string;
  kind: CommunityPostKind;
  title: string;
  contentHtml: string;
  excerpt: string;
  coverImage?: string;
  group: CommunityPostGroup;
  destination: string;
  hashtags: string[];
  tourId?: string | null;
  bookingId?: string | null;
  rating?: number | null; // 1-5 sao (bắt buộc với review, null với post)
  isOfficial: boolean;
  isPinned: boolean;
  status: CommunityPostStatus;
  rejectReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  // Dynamic fields populated on client
  media?: CommunityPostMedia[];
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  parentId?: string | null; // null: cấp 1; có parentId: cấp 2
  content: string;
  status: CommunityCommentStatus;
  createdAt: string;
  replies?: CommunityComment[];
}

export interface CommunityReaction {
  id: string;
  userId: string;
  postId: string;
  type: 'like';
  createdAt: string;
}

export interface CommunitySave {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface CommunityReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: CommunityReportTarget;
  targetId: string;
  reason: string;
  status: CommunityReportStatus;
  handledBy?: string | null;
  createdAt: string;
}

export interface CommunityUserFlag {
  userId: string;
  isPostBanned: boolean;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CommunityModerationLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  createdAt: string;
}

export interface CommunityGroupConfig {
  id: CommunityPostGroup;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface PostFilterOptions {
  group?: string;
  destination?: string;
  kind?: string;
  sort?: 'newest' | 'popular' | 'featured';
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreatePostPayload {
  kind: CommunityPostKind;
  title: string;
  contentHtml: string;
  excerpt?: string;
  coverImage?: string;
  group?: CommunityPostGroup;
  destination?: string;
  hashtags?: string[];
  tourId?: string | null;
  bookingId?: string | null;
  rating?: number | null;
  media?: { url: string; alt?: string }[];
  isOfficial?: boolean;
}

export interface UpdatePostPayload {
  title?: string;
  contentHtml?: string;
  excerpt?: string;
  coverImage?: string;
  group?: CommunityPostGroup;
  destination?: string;
  hashtags?: string[];
  media?: { url: string; alt?: string }[];
}

export interface ModeratePostPayload {
  action: 'publish' | 'reject' | 'hide' | 'unhide' | 'pin' | 'unpin' | 'delete';
  reason?: string;
}
