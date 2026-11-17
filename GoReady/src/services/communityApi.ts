import { API_BASE } from '../api';

/** Người dùng gửi kèm request (app chưa có token; server đối chiếu id/email với bảng users). */
export interface CommunityAuth {
  id: string;
  email: string;
}

export interface TravelBadge {
  id: string;
  name: string;
  earned: boolean;
  current: number;
  threshold: number;
  remaining: number;
  unit: string;
  remainingLabel: string;
}

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'hidden';

export interface TravelRecentPost {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  isVerified: boolean;
  createdAt: string;
  publishedAt: string | null;
  rejectReason: string | null;
}

export interface TravelReview {
  id: string;
  tourId: string;
  tourName: string;
  rating: number;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

export interface TravelSummary {
  displayName: string;
  avatar: string | null;
  joinedAt: string | null;
  bio: string;
  isPublic: boolean;
  postsCount: number;
  reviewsCount: number;
  verifiedTripsCount: number;
  helpfulCount: number;
  gopointBalance: number;
  gopointHistory: { id: string; delta: number; reason: string; createdAt: string }[];
  allProvinces: string[];
  visitedProvinces: string[];
  badges: TravelBadge[];
  nextBadgeHint: string | null;
  recentPosts: TravelRecentPost[];
  reviews: TravelReview[];
}

export interface EligibleBooking {
  id: string;
  bookingCode: string;
  tourId: string;
  tourName: string;
  tourDestination: string;
  departureDate: string;
}

export interface CreatePostPayload {
  title: string;
  contentHtml: string;
  excerpt?: string;
  group: 'family' | 'backpack' | 'deal' | 'student';
  destination?: string;
  hashtags?: string[];
  /** Có bookingId => bài review gắn tour (bắt buộc rating 1–5) */
  bookingId?: string;
  rating?: number;
}

async function request<T>(auth: CommunityAuth, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/community${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': auth.id,
      'x-user-email': auth.email,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Yêu cầu thất bại: ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export const communityApi = {
  getMySummary: (auth: CommunityAuth) => request<TravelSummary>(auth, '/my-summary'),
  updateMyProfile: (auth: CommunityAuth, patch: { bio?: string; isPublic?: boolean }) =>
    request<{ bio: string; isPublic: boolean }>(auth, '/my-profile', { method: 'PUT', body: JSON.stringify(patch) }),
  getEligibleBookings: (auth: CommunityAuth) => request<EligibleBooking[]>(auth, '/my-eligible-bookings'),
  createPost: (auth: CommunityAuth, payload: CreatePostPayload) =>
    request<{ id: string; slug: string; status: PostStatus }>(auth, '/posts', { method: 'POST', body: JSON.stringify(payload) }),
};
