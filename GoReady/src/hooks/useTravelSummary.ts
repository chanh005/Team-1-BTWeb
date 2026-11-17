import React from 'react';
import { communityApi, type CommunityAuth, type TravelSummary } from '../services/communityApi';

// Một nguồn dữ liệu cho cả "Hồ sơ du lịch" và "Trang cá nhân":
// kết quả được giữ ở module (theo user id) nên hai trang dùng chung, và refetch() cập nhật cả hai.
interface Entry {
  data: TravelSummary | null;
  error: string;
  loading: boolean;
  inflight: Promise<void> | null;
}

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const EMPTY: Entry = { data: null, error: '', loading: false, inflight: null };

function load(auth: CommunityAuth): Promise<void> {
  const prev = store.get(auth.id) ?? EMPTY;
  if (prev.inflight) return prev.inflight;
  const inflight = communityApi
    .getMySummary(auth)
    .then((data) => {
      store.set(auth.id, { data, error: '', loading: false, inflight: null });
    })
    .catch((e: unknown) => {
      const cur = store.get(auth.id) ?? EMPTY;
      store.set(auth.id, { ...cur, error: e instanceof Error ? e.message : 'Không tải được dữ liệu', loading: false, inflight: null });
    })
    .finally(emit);
  store.set(auth.id, { ...prev, loading: true, error: '', inflight });
  emit();
  return inflight;
}

export function useTravelSummary(user: CommunityAuth | null | undefined) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const userId = user?.id;
  const email = user?.email;

  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);

  React.useEffect(() => {
    if (userId && email) void load({ id: userId, email });
  }, [userId, email]);

  const refetch = React.useCallback(async () => {
    if (userId && email) await load({ id: userId, email });
  }, [userId, email]);

  const entry = (userId && store.get(userId)) || EMPTY;
  return {
    data: entry.data,
    // loading = lần tải đầu (chưa có dữ liệu); khi refetch vẫn giữ dữ liệu cũ để không nháy skeleton
    loading: Boolean(userId) && entry.data === null && !entry.error,
    refreshing: entry.loading,
    error: entry.error,
    refetch,
  };
}
