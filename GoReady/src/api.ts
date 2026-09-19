import type { AccountUser, Booking, BookingStatus, Tour } from './types';

// Relative path: in dev it's proxied to the local Express server (vite.config.ts),
// and on Vercel it resolves to the serverless functions under /api on the same origin.
const API_BASE = '/api';

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

  getBookings: () => request<Booking[]>('/bookings'),
  createBooking: (booking: Booking) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(booking) }),
  updateBookingStatus: (id: string, status: BookingStatus) =>
    request<Booking>(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getUsers: () => request<AccountUser[]>('/users'),
  login: (email: string, password: string) =>
    request<AccountUser>('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<AccountUser>('/users/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  toggleUserStatus: (id: string) => request<AccountUser>(`/users/${id}/status`, { method: 'PATCH' }),
  updateAvatar: (id: string, avatar: string) =>
    request<AccountUser>(`/users/${id}/avatar`, { method: 'PATCH', body: JSON.stringify({ avatar }) }),
};
