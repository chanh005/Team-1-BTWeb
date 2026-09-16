import type { AccountUser, Booking, BookingStatus, Tour } from './types';

// Absolute URL (not a relative path) so both the user site and the admin
// console can call the same backend regardless of which page/port serves them.
const API_BASE = 'http://localhost:4000/api';

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
  login: (name: string, email: string) => request<AccountUser>('/users/login', { method: 'POST', body: JSON.stringify({ name, email }) }),
  toggleUserStatus: (id: string) => request<AccountUser>(`/users/${id}/status`, { method: 'PATCH' }),
};
