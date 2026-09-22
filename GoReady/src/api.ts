import type { AccountUser, Article, ArticleComment, ArticleFeedback, ArticleRatingSummary, Booking, BookingStatus, Departure, HoldResponse, SeatRecord, Tour } from './types';

// Relative path: in dev it's proxied to the local express server (vite.config.ts),
// and on Vercel it resolves to the serverless functions under /api on the same origin.
export const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
    if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getTours: () => request<Tour[]>('/tours'),
  createTour: (tour: Partial<Tour>) => request<Tour>('/tours', { method: 'POST', body: JSON.stringify(tour) }),
  updateTour: (id: string, patch: Partial<Tour>) => request<Tour>(`/tours/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  toggleTourHidden: (id: string) => request<Tour>(`/tours/${id}/hidden`, { method: 'PATCH' }),
  deleteTour: (id: string) => request<void>(`/tours/${id}`, { method: 'DELETE' }),

  /** Stores a photo (JPEG/PNG/WebP/GIF data URL) and returns the URL to save in a tour's coverImage / gallery. */
  uploadImage: (dataUrl: string) => request<{ id: string; url: string }>('/images', { method: 'POST', body: JSON.stringify({ dataUrl }) }),

  /** Bài đăng của Bảng tin (Tin tức / Cẩm nang du lịch), do admin biên tập. Admin: mọi bài, kể cả nháp/ẩn/hẹn giờ. */
  getArticles: () => request<Article[]>('/articles'),
  /** Bảng tin cho người đọc: bỏ bài ẩn, bản nháp và bài hẹn giờ chưa đến lúc; bài ghim đứng đầu. */
  getPublicArticles: () => request<Article[]>('/articles?public=1'),
  /** Gọi mỗi lần người đọc mở một bài viết. */
  trackArticleView: (id: string) => request<{ views: number }>(`/articles/${id}/view`, { method: 'POST' }),
  /** Bình luận (chưa bị ẩn) + điểm đánh giá của bài; truyền `userId` để biết người đó đã chấm mấy sao. */
  getArticleFeedback: (id: string, userId?: string) =>
    request<ArticleFeedback>(`/articles/${id}/comments${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
  addArticleComment: (id: string, userId: string, content: string) =>
    request<ArticleComment>(`/articles/${id}/comments`, { method: 'POST', body: JSON.stringify({ userId, content }) }),
  rateArticle: (id: string, userId: string, rating: number) =>
    request<ArticleRatingSummary>(`/articles/${id}/rating`, { method: 'PUT', body: JSON.stringify({ userId, rating }) }),
  /** Admin: kiểm duyệt bình luận. */
  getComments: () => request<ArticleComment[]>('/comments'),
  setCommentHidden: (id: string, hidden: boolean) =>
    request<ArticleComment>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ hidden }) }),
  deleteComment: (id: string) => request<void>(`/comments/${id}`, { method: 'DELETE' }),
  createArticle: (article: Partial<Article>) => request<Article>('/articles', { method: 'POST', body: JSON.stringify(article) }),
  updateArticle: (id: string, patch: Partial<Article>) => request<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  toggleArticleHidden: (id: string) => request<Article>(`/articles/${id}/hidden`, { method: 'PATCH' }),
  deleteArticle: (id: string) => request<void>(`/articles/${id}`, { method: 'DELETE' }),

  getBookings: () => request<Booking[]>('/bookings'),
  createBooking: (booking: Booking) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(booking) }),
  updateBookingStatus: (id: string, status: BookingStatus) =>
    request<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  /** Tồn kho chỗ ngồi theo ngày khởi hành (chỉ có ở mock backend). `clientId` phân biệt "tôi" với "người khác" khi giữ chỗ. */
  syncDepartures: (clientId: string, departures: Pick<Departure, 'id' | 'maxSeats' | 'availableSeats'>[]) =>
    request<SeatRecord[]>('/departures/sync', { method: 'POST', body: JSON.stringify({ clientId, departures }) }),
  holdDeparture: (id: string, clientId: string, seats: number) =>
    request<HoldResponse>(`/departures/${encodeURIComponent(id)}/hold`, { method: 'POST', body: JSON.stringify({ clientId, seats }) }),
  releaseDeparture: (id: string, clientId: string) =>
    request<{ ok: boolean }>(`/departures/${encodeURIComponent(id)}/release`, { method: 'POST', body: JSON.stringify({ clientId }) }),
  commitDeparture: (id: string, clientId: string, seats: number) =>
    request<{ ok: boolean }>(`/departures/${encodeURIComponent(id)}/commit`, { method: 'POST', body: JSON.stringify({ clientId, seats }) }),
  returnDeparture: (id: string, seats: number) =>
    request<{ ok: boolean }>(`/departures/${encodeURIComponent(id)}/return`, { method: 'POST', body: JSON.stringify({ seats }) }),

  getUsers: () => request<AccountUser[]>('/users'),
  login: (email: string, password: string) =>
    request<AccountUser>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<AccountUser>('/users/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  toggleUserStatus: (id: string) => request<AccountUser>(`/users/${id}/status`, { method: 'PATCH' }),
  updateAvatar: (id: string, avatar: string) =>
    request<AccountUser>(`/users/${id}/avatar`, { method: 'PATCH', body: JSON.stringify({ avatar }) }),
};
