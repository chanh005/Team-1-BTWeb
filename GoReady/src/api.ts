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
    // Lỗi theo từng ô nhập của Seller Center: { tenTruong: 'thông báo' }
    (err as Error & { fields?: Record<string, string> }).fields = body.fields;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Hồ sơ người bán (Admin xem để duyệt). Tên trường theo bảng `sellers`. */
export interface AdminSeller {
  id: string;
  business_name: string;
  tax_code: string;
  business_type: 'domestic_travel' | 'international_travel' | 'tour_organizer';
  legal_representative: string;
  address: string;
  hotline: string;
  website: string | null;
  logo_url: string | null;
  travel_license_number: string | null;
  travel_license_issued_at: string | null;
  business_reg_file: string | null;
  travel_license_file: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  created_at: string;
  email: string;
  phone: string;
}

/** Hồ sơ của chính người bán đang đăng nhập. */
export type SellerProfile = Omit<AdminSeller, 'email' | 'phone'>;

export type SellerTourStatus = 'draft' | 'pending_review' | 'active' | 'rejected' | 'hidden';

/** Tour đầy đủ của người bán (form Đăng tour / Sửa tour). */
export interface SellerTourFull {
  id: string;
  status: SellerTourStatus;
  reject_reason: string | null;
  name: string;
  destination: string;
  departure: string;
  transport: string;
  hotelStars: number;
  duration: number;
  nights: number;
  groupSizeTags: string[];
  shortDescription: string;
  coverImage: string;
  images: string[];
  itinerary: { day_number: number; title: string; description: string; has_breakfast: boolean; has_lunch: boolean; has_dinner: boolean }[];
  price: number;
  childPrice: number | null;
  departures: { id: number; departure_date: string; price: number | null; max_seats: number; booked_seats: number; booking_deadline: string | null }[];
  includes: string[];
  excludes: string[];
  cancellationPolicy: string;
  child_policy: string | null;
  notes: string | null;
}

/** Một dòng trong "Tour của tôi". */
export interface SellerTourRow {
  id: string;
  name: string;
  destination: string;
  coverImage: string;
  departure: string;
  transport: string;
  hotelStars: number;
  price: number;
  duration: number;
  nights: number;
  status: SellerTourStatus;
  reject_reason: string | null;
  next_departure: string | null;
  max_seats: number;
  booked_seats: number;
}

/** Booking của khách vào tour của người bán. `ongoing` là trạng thái suy ra (đã xác nhận và đang trong thời gian tour). */
export interface SellerBooking {
  id: string;
  bookingCode: string;
  tourId: string;
  tour_name: string;
  status: 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  ongoing: boolean;
  start_date: string | null;
  end_date: string | null;
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string | null;
  seller_note: string | null;
  createdAt: string;
  confirmed_at: string | null;
  completed_at: string | null;
  departure_id: number | null;
  max_seats: number | null;
  booked_seats: number | null;
  remaining_seats: number | null;
  can_complete: boolean;
}

/** Dữ liệu trang Tổng quan, tính một lần ở server. */
export interface SellerDashboard {
  counts: { pending_bookings: number; active_tours: number; pending_review_tours: number; departing_soon_bookings: number };
  pending_bookings: { id: string; bookingCode: string; tour_name: string; start_date: string | null; adults: number; children: number; infants: number; status: string }[];
  attention: { type: 'low_seats' | 'rejected' | 'no_departure'; tour_id: string; tour_name: string; status: string; remaining_seats?: number; departure_date?: string; reject_reason?: string | null }[];
}

export interface SellerBookingCounts {
  pending: number;
  confirmed: number;
  ongoing: number;
  completed: number;
  closed: number;
}

/** Tour của người bán (Admin xem để duyệt). */
export interface AdminSellerTour {
  id: string;
  status: 'draft' | 'pending_review' | 'active' | 'rejected' | 'hidden';
  seller_name: string | null;
  name: string;
  destination: string;
  departure: string;
  transport: string;
  hotelStars: number;
  duration: number;
  nights: number;
  coverImage: string;
  price: number;
  discountPrice: number | null;
  childPrice: number | null;
  shortDescription: string;
  itinerary: { day_number: number; title: string; description: string; has_breakfast: boolean; has_lunch: boolean; has_dinner: boolean }[];
  departures: { id: number; departure_date: string; price: number | null; max_seats: number; booked_seats: number; booking_deadline: string | null }[];
  includes: string[];
  excludes: string[];
  cancellationPolicy: string;
  child_policy: string | null;
  notes: string | null;
}

export const api = {
  getTours: () => request<Tour[]>('/tours'),
  /** Trang người mua: chỉ tour đã được duyệt. (Admin dùng getTours để thấy tất cả.) */
  getPublicTours: () => request<Tour[]>('/tours?public=1'),

  // --- Seller Center (token ký ở server; Admin cũng lấy token qua sellerLogin) ---
  sellerLogin: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string }; seller: SellerProfile | null }>('/seller/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  sellerRegister: (body: Record<string, unknown>) =>
    request<{ token: string; seller: SellerProfile }>('/seller/register', { method: 'POST', body: JSON.stringify(body) }),
  sellerMe: (token: string) => request<{ user: { id: string; name: string; email: string; phone: string }; seller: SellerProfile }>('/seller/me', { headers: bearer(token) }),
  sellerResubmit: (token: string, body: Record<string, unknown>) =>
    request<{ seller: SellerProfile }>('/seller/me', { method: 'PUT', headers: bearer(token), body: JSON.stringify(body) }),
  /** Tải file lên (logo / giấy phép / ảnh tour). Trả về đường dẫn để lưu vào hồ sơ. */
  sellerUpload: (kind: 'logo' | 'business_reg' | 'travel_license' | 'tour_image', dataUrl: string) =>
    request<{ id: string; url: string }>('/seller/files', { method: 'POST', body: JSON.stringify({ kind, dataUrl }) }),
  sellerListTours: (token: string, opts: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.status) qs.set('status', opts.status);
    if (opts.q) qs.set('q', opts.q);
    return request<{ tours: SellerTourRow[]; counts: Record<SellerTourStatus, number> }>(`/seller/tours?${qs}`, { headers: bearer(token) });
  },
  sellerGetTour: (token: string, id: string) => request<SellerTourFull>(`/seller/tours/${id}`, { headers: bearer(token) }),
  /** Tạo bản nháp (id = null) hoặc lưu tour đã có. Bản nháp không cần điền đủ. */
  sellerSaveTour: (token: string, id: string | null, body: Record<string, unknown>) =>
    request<SellerTourFull>(id ? `/seller/tours/${id}` : '/seller/tours', { method: id ? 'PUT' : 'POST', headers: bearer(token), body: JSON.stringify(body) }),
  sellerTourAction: (token: string, id: string, action: 'hide' | 'show' | 'submit') =>
    request<unknown>(`/seller/tours/${id}/${action}`, { method: 'POST', headers: bearer(token), body: '{}' }),
  sellerDeleteTour: (token: string, id: string) => request<void>(`/seller/tours/${id}`, { method: 'DELETE', headers: bearer(token) }),
  sellerDashboard: (token: string) => request<SellerDashboard>('/seller/dashboard', { headers: bearer(token) }),
  sellerListBookings: (token: string, status?: string) =>
    request<{ bookings: SellerBooking[]; counts: SellerBookingCounts }>(`/seller/bookings${status ? `?status=${status}` : ''}`, { headers: bearer(token) }),
  sellerGetBooking: (token: string, id: string) => request<SellerBooking>(`/seller/bookings/${id}`, { headers: bearer(token) }),
  sellerBookingAction: (token: string, id: string, action: 'confirm' | 'reject' | 'complete', sellerNote?: string) =>
    request<SellerBooking>(`/seller/bookings/${id}/${action}`, { method: 'POST', headers: bearer(token), body: JSON.stringify({ seller_note: sellerNote }) }),
  adminListSellers: (token: string, status = 'pending') =>
    request<AdminSeller[]>(`/seller/admin/sellers?status=${status}`, { headers: bearer(token) }),
  adminReviewSeller: (token: string, id: string, decision: 'approve' | 'reject', reason?: string) =>
    request<AdminSeller>(`/seller/admin/sellers/${id}/${decision}`, { method: 'POST', headers: bearer(token), body: JSON.stringify({ reason }) }),
  adminListSellerTours: (token: string, status = 'pending_review') =>
    request<AdminSellerTour[]>(`/seller/admin/tours?status=${status}`, { headers: bearer(token) }),
  adminReviewSellerTour: (token: string, id: string, decision: 'approve' | 'reject', reason?: string) =>
    request<AdminSellerTour>(`/seller/admin/tours/${id}/${decision}`, { method: 'POST', headers: bearer(token), body: JSON.stringify({ reason }) }),
  /** Tải file giấy phép (cần token) và trả về blob để mở trong tab mới. */
  fetchSellerFile: async (token: string, url: string) => {
    const res = await fetch(url, { headers: bearer(token) });
    if (!res.ok) throw new Error(`Không mở được file (${res.status})`);
    return res.blob();
  },
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
