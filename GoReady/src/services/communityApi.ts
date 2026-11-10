import { API_BASE } from '../api';
import type {
  CommunityPost,
  CommunityComment,
  CommunityReaction,
  CommunitySave,
  CommunityReport,
  PostFilterOptions,
  CreatePostPayload,
  UpdatePostPayload,
  ModeratePostPayload,
} from '../types/community';

interface AuthHeaders {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

function buildHeaders(auth?: AuthHeaders): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth?.userId) headers['x-user-id'] = auth.userId;
  if (auth?.userEmail) headers['x-user-email'] = auth.userEmail;
  if (auth?.userName) headers['x-user-name'] = auth.userName;
  if (auth?.userRole) headers['x-user-role'] = auth.userRole;
  return headers;
}

async function request<T>(path: string, options?: RequestInit, auth?: AuthHeaders): Promise<T> {
  const headers = {
    ...buildHeaders(auth),
    ...(options?.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Yêu cầu thất bại: ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const communityApi = {
  /** Lấy danh sách bài viết công khai */
  getPosts: (filters: PostFilterOptions = {}, auth?: AuthHeaders) => {
    const params = new URLSearchParams();
    if (filters.group && filters.group !== 'all') params.set('group', filters.group);
    if (filters.destination && filters.destination !== 'all') params.set('destination', filters.destination);
    if (filters.kind && filters.kind !== 'all') params.set('kind', filters.kind);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{
      items: CommunityPost[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(`/community/posts${qs}`, { method: 'GET' }, auth);
  },

  /** Lấy danh sách bài viết của chính tôi (mọi trạng thái) */
  getMyPosts: (auth: AuthHeaders) =>
    request<CommunityPost[]>('/community/my-posts', { method: 'GET' }, auth),

  /** Lấy danh sách các đơn đặt tour đã hoàn thành chưa đánh giá của tôi */
  getMyEligibleBookings: (auth: AuthHeaders) =>
    request<{
      id: string;
      bookingCode: string;
      tourId: string;
      tourName: string;
      tourCoverImage?: string;
      tourDestination: string;
      departureDate?: string;
      totalPrice: number;
    }[]>('/community/my-eligible-bookings', { method: 'GET' }, auth),

  /** Xem chi tiết bài viết theo slug */
  getPostBySlug: (slug: string, auth?: AuthHeaders) =>
    request<CommunityPost>(`/community/posts/${encodeURIComponent(slug)}`, { method: 'GET' }, auth),

  /** Tăng lượt xem bài viết */
  incrementView: (postId: string) =>
    request<{ views: number }>(`/community/posts/${encodeURIComponent(postId)}/view`, { method: 'POST' }),

  /** Tạo bài viết hoặc bài review mới */
  createPost: (data: CreatePostPayload, auth: AuthHeaders) =>
    request<CommunityPost>('/community/posts', { method: 'POST', body: JSON.stringify(data) }, auth),

  /** Cập nhật bài viết của chính mình */
  updatePost: (id: string, data: UpdatePostPayload, auth: AuthHeaders) =>
    request<CommunityPost>(`/community/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }, auth),

  /** Xóa mềm bài viết */
  deletePost: (id: string, auth: AuthHeaders) =>
    request<{ success: boolean; message: string }>(`/community/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }, auth),

  /** Thích / Bỏ thích bài viết */
  toggleLike: (postId: string, auth: AuthHeaders) =>
    request<{ liked: boolean; likesCount: number }>(`/community/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' }, auth),

  /** Lưu / Bỏ lưu bài viết */
  toggleSave: (postId: string, auth: AuthHeaders) =>
    request<{ saved: boolean }>(`/community/posts/${encodeURIComponent(postId)}/save`, { method: 'POST' }, auth),

  /** Danh sách bình luận của bài viết */
  getComments: (postId: string, page = 1, limit = 50) =>
    request<CommunityComment[]>(`/community/posts/${encodeURIComponent(postId)}/comments?page=${page}&limit=${limit}`, { method: 'GET' }),

  /** Gửi bình luận */
  createComment: (postId: string, content: string, parentId?: string | null, auth?: AuthHeaders) =>
    request<CommunityComment>(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      { method: 'POST', body: JSON.stringify({ content, parentId: parentId || null }) },
      auth
    ),

  /** Xóa bình luận */
  deleteComment: (commentId: string, auth: AuthHeaders) =>
    request<{ success: boolean; message: string }>(`/community/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }, auth),

  /** Báo cáo vi phạm bài viết hoặc bình luận */
  createReport: (targetType: 'post' | 'comment', targetId: string, reason: string, auth: AuthHeaders) =>
    request<{ success: boolean; message: string }>(
      '/community/reports',
      { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) },
      auth
    ),

  // --------------------------------------------------------------------------
  // ADMIN API
  // --------------------------------------------------------------------------

  /** Admin: Lấy danh sách bài viết theo trạng thái kiểm duyệt */
  getAdminPosts: (status = 'pending', page = 1, limit = 20, auth: AuthHeaders) =>
    request<{
      items: CommunityPost[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/community/admin/posts?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`, { method: 'GET' }, auth),

  /** Admin: Kiểm duyệt bài viết */
  moderatePost: (postId: string, payload: ModeratePostPayload, auth: AuthHeaders) =>
    request<CommunityPost>(`/community/admin/posts/${encodeURIComponent(postId)}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, auth),

  /** Admin: Duyệt hàng loạt */
  bulkPublish: (postIds: string[], auth: AuthHeaders) =>
    request<{ success: boolean; count: number }>(`/community/admin/posts/bulk-publish`, {
      method: 'POST',
      body: JSON.stringify({ postIds }),
    }, auth),

  /** Admin: Khóa / Mở khóa quyền đăng bài của người dùng */
  setUserPostBan: (userId: string, isBanned: boolean, note: string, auth: AuthHeaders) =>
    request<{ success: boolean; isPostBanned: boolean }>(`/community/admin/users/ban`, {
      method: 'POST',
      body: JSON.stringify({ userId, isBanned, note }),
    }, auth),

  /** Admin: Danh sách báo cáo */
  getAdminReports: (status = 'open', auth: AuthHeaders) =>
    request<CommunityReport[]>(`/community/admin/reports?status=${encodeURIComponent(status)}`, { method: 'GET' }, auth),

  /** Admin: Xử lý báo cáo vi phạm */
  handleReport: (reportId: string, status: 'resolved' | 'dismissed', note: string, auth: AuthHeaders) =>
    request<{ success: boolean }>(`/community/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }, auth),

  /** Admin: Thống kê tổng quan cộng đồng */
  getAdminStats: (auth: AuthHeaders) =>
    request<{
      pendingCount: number;
      openReportsCount: number;
      todayPostsCount: number;
      weekPostsCount: number;
      postsByKind: { review: number; post: number; official: number };
    }>('/community/admin/stats', { method: 'GET' }, auth),

  /** Admin: Danh sách bình luận mới nhất */
  getAdminComments: (auth: AuthHeaders) =>
    request<{
      id: string;
      postId: string;
      postTitle: string;
      postSlug?: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      content: string;
      status: string;
      createdAt: string;
    }[]>('/community/admin/comments', { method: 'GET' }, auth),

  /** Admin: Danh sách người dùng đăng bài */
  getAdminUsers: (auth: AuthHeaders) =>
    request<{
      userId: string;
      userName: string;
      userEmail: string;
      totalPosts: number;
      publishedPosts: number;
      rejectedPosts: number;
      isPostBanned: boolean;
      banNote?: string;
      bannedAt?: string;
    }[]>('/community/admin/users', { method: 'GET' }, auth),

  /** Admin: Nhật ký kiểm duyệt */
  getAdminLogs: (auth: AuthHeaders) =>
    request<{
      id: string;
      adminId: string;
      action: string;
      targetType: string;
      targetId: string;
      reason?: string;
      createdAt: string;
    }[]>('/community/admin/logs', { method: 'GET' }, auth),
};

