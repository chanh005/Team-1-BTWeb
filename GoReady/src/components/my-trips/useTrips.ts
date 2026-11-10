import React from 'react';
import type { Booking } from '../../types';
import { fetchChuyenDi } from './tripApi';
import type { ChuyenDi } from './types';
import { PAID_STATUSES } from './tripUtils';

const POLL_MS = 20000;

/**
 * Loads the trips (ChuyenDi) of the signed-in account. `bookings` are that account's orders: the trips are fetched by
 * their contact e-mail and re-fetched as soon as an order is added or changes status (e.g. a fresh payment).
 */
export function useTrips(bookings: Booking[]) {
  const email = bookings[0]?.contactEmail ?? '';
  const signature = bookings.map((b) => `${b.id}:${b.status}`).join('|');
  const [trips, setTrips] = React.useState<ChuyenDi[]>([]);
  const [loading, setLoading] = React.useState(Boolean(email));
  const [error, setError] = React.useState<string | null>(null);
  const requestId = React.useRef(0);

  const reload = React.useCallback(async () => {
    if (!email) {
      setTrips([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    try {
      const data = await fetchChuyenDi(email);
      if (id !== requestId.current) return; // a newer request superseded this one
      setTrips(data.filter((t) => PAID_STATUSES.includes(t.don.trangThai)));
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Không tải được chuyến đi');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [email]);

  React.useEffect(() => {
    void reload();
  }, [reload, signature]);

  React.useEffect(() => {
    const t = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(t);
  }, [reload]);

  return { trips, loading, error, reload };
}
