import type { AccountUser, Article, ArticleInput, ArticleList, ArticleStatus, ArticleSummary, Booking, BookingStatus, Departure, HoldResponse, SeatRecord, Tour } from './types';

// Relative path: in dev it's proxied to the local express server (vite.config.ts),
// and on Vercel it resolves to the serverless functions under /api on the same origin.
export const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Cho phép truyền thêm header (ví dụ x-user-id của admin) mà vẫn giữ Content-Type JSON
  const { headers: extraHeaders, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders as Record<string, string> | undefined) },
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

/** Admin đang đăng nhập: id và email được gửi kèm mọi thao tác ghi; server kiểm tra role trong bảng users */
export interface AdminActor {
  id: string;
  email: string;
}

const actorHeaders = (actor: AdminActor) => ({ 'x-user-id': actor.id, 'x-user-email': actor.email });

/** Bài viết cẩm nang: đọc công khai; ghi và xem bản nháp cần quyền admin */
export const articleApi = {
  list: (opts: { page?: number; limit?: number; showOnFeed?: boolean; category?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.page) qs.set('page', String(opts.page));
    if (opts.limit) qs.set('limit', String(opts.limit));
    if (opts.showOnFeed !== undefined) qs.set('showOnFeed', String(opts.showOnFeed));
    if (opts.category) qs.set('category', opts.category);
    return request<ArticleList<ArticleSummary>>(`/articles?${qs}`);
  },
  getBySlug: (slug: string) => request<Article>(`/articles/slug/${encodeURIComponent(slug)}`),
  listManage: (actor: AdminActor, opts: { search?: string; status?: ArticleStatus } = {}) => {
    const qs = new URLSearchParams({ limit: '100' });
    if (opts.search) qs.set('search', opts.search);
    if (opts.status) qs.set('status', opts.status);
    return request<ArticleList<Article>>(`/articles/manage?${qs}`, { headers: actorHeaders(actor) });
  },
  create: (actor: AdminActor, input: ArticleInput) =>
    request<Article>('/articles', { method: 'POST', headers: actorHeaders(actor), body: JSON.stringify(input) }),
  update: (actor: AdminActor, id: number, patch: ArticleInput) =>
    request<Article>(`/articles/${id}`, { method: 'PUT', headers: actorHeaders(actor), body: JSON.stringify(patch) }),
  remove: (actor: AdminActor, id: number) =>
    request<{ success: boolean; id: number }>(`/articles/${id}`, { method: 'DELETE', headers: actorHeaders(actor) }),
};
