import { api } from '../api';
import type { Departure, SeatRecord, SeatStatus } from '../types';

// ---------------------------------------------------------------------------
// Tồn kho chỗ ngồi & giữ chỗ theo ngày khởi hành
//
// Nguồn sự thật là backend (`/api/departures/*`, hiện chỉ có ở mock backend): mọi trình duyệt/máy thấy cùng
// một số chỗ và cùng một lượt giữ chỗ. Nếu backend không có các endpoint này (backend Postgres thật, Vercel…)
// thì tự chuyển sang bản `localStorage` bên dưới — chỉ đúng trong một trình duyệt, đồng bộ giữa các tab.
//
// Mỗi tab có một `clientId` riêng (sessionStorage): mở 2 tab = 2 khách khác nhau để thử luồng chống trùng vé.
// ---------------------------------------------------------------------------

/** Thời gian giữ chỗ khi khách vào bước thanh toán (backend dùng cùng giá trị). */
export const HOLD_SECONDS = 10 * 60;

/** Tồn kho hiện tại của một ngày khởi hành, đã tính theo góc nhìn của khách đang xem. */
export interface SeatInfo {
  maxSeats: number;
  availableSeats: number;
  status: SeatStatus;
  /** Chính khách này đang giữ chỗ (khác với "người khác đang giữ"). */
  heldByMe: boolean;
  /** Mốc hết hạn giữ chỗ (ms epoch, theo đồng hồ máy khách). */
  holdExpiresAt?: number;
}

export type HoldResult = { ok: true; expiresAt: number } | { ok: false; reason: 'held' | 'sold-out' | 'not-enough' };

// ---------------------------------------------------------------------------
// Danh tính khách & thông báo thay đổi
// ---------------------------------------------------------------------------
const CLIENT_KEY = 'goready-seat-client';
let fallbackClientId = '';

/** Định danh của khách hiện tại (mỗi tab một id). */
export const getClientId = (): string => {
  const make = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    let id = window.sessionStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = make();
      window.sessionStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch {
    fallbackClientId ||= make();
    return fallbackClientId;
  }
};

const STORAGE_KEY = 'goready-seat-inventory-v1';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Lắng nghe thay đổi tồn kho do chính tab này (hoặc, ở chế độ localStorage, do tab khác) gây ra. */
export const subscribeSeatChanges = (listener: () => void): (() => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

// ---------------------------------------------------------------------------
// Bản localStorage (dự phòng)
// ---------------------------------------------------------------------------
interface SeatHold {
  holderId: string;
  seats: number;
  expiresAt: number;
}

interface InventoryState {
  /** Số chỗ đã bán theo mã đoàn. */
  sold: Record<string, number>;
  /** Mỗi đoàn chỉ có một người giữ chỗ tại một thời điểm. */
  holds: Record<string, SeatHold>;
}

// Dự phòng khi localStorage bị chặn (chế độ riêng tư…): vẫn chạy được trong một tab
let memoryState: InventoryState = { sold: {}, holds: {} };

const readRaw = (): InventoryState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    return { sold: parsed.sold ?? {}, holds: parsed.holds ?? {} };
  } catch {
    return memoryState;
  }
};

/** Đọc trạng thái, bỏ các lượt giữ chỗ đã quá hạn. */
const readInventory = (now = Date.now()): InventoryState => {
  const state = readRaw();
  const holds: Record<string, SeatHold> = {};
  for (const [id, hold] of Object.entries(state.holds)) if (hold.expiresAt > now) holds[id] = hold;
  return Object.keys(holds).length === Object.keys(state.holds).length ? state : { sold: state.sold, holds };
};

const writeInventory = (state: InventoryState): void => {
  memoryState = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / blocked storage
  }
  emit();
};

const localInfo = (d: Departure, state: InventoryState, clientId: string): SeatInfo => {
  const availableSeats = Math.max(0, d.availableSeats - (state.sold[d.id] ?? 0));
  const hold = state.holds[d.id];
  const heldByMe = hold?.holderId === clientId;
  const status: SeatStatus = availableSeats === 0 ? 'sold-out' : hold && !heldByMe ? 'holding' : 'available';
  return { maxSeats: d.maxSeats, availableSeats, status, heldByMe, holdExpiresAt: hold?.expiresAt };
};

const localHold = (d: Departure, seats: number): HoldResult => {
  const now = Date.now();
  const clientId = getClientId();
  const state = readInventory(now);
  const info = localInfo(d, state, clientId);
  if (info.status === 'sold-out') return { ok: false, reason: 'sold-out' };
  if (info.status === 'holding') return { ok: false, reason: 'held' };
  if (seats > info.availableSeats) return { ok: false, reason: 'not-enough' };
  const expiresAt = now + HOLD_SECONDS * 1000;
  writeInventory({ ...state, holds: { ...state.holds, [d.id]: { holderId: clientId, seats, expiresAt } } });
  return { ok: true, expiresAt };
};

const localRelease = (id: string): void => {
  const state = readInventory();
  if (state.holds[id]?.holderId !== getClientId()) return;
  const { [id]: _released, ...holds } = state.holds;
  writeInventory({ ...state, holds });
};

const localCommit = (d: Departure, seats: number): boolean => {
  const state = readInventory();
  if (state.holds[d.id]?.holderId !== getClientId()) return false;
  if (seats > Math.max(0, d.availableSeats - (state.sold[d.id] ?? 0))) return false;
  const { [d.id]: _consumed, ...holds } = state.holds;
  writeInventory({ sold: { ...state.sold, [d.id]: (state.sold[d.id] ?? 0) + seats }, holds });
  return true;
};

const localReturn = (id: string, seats: number): void => {
  const state = readInventory();
  const sold = state.sold[id];
  if (!sold) return;
  writeInventory({ ...state, sold: { ...state.sold, [id]: Math.max(0, sold - seats) } });
};

// ---------------------------------------------------------------------------
// Chọn nguồn: backend nếu có endpoint, không thì localStorage
// ---------------------------------------------------------------------------
type Mode = 'unknown' | 'remote' | 'local';
let mode: Mode = 'unknown';

/** Backend không có endpoint tồn kho (404/405/501/503) hoặc chưa kết nối được. */
const isMissingEndpoint = (err: unknown): boolean => {
  const status = (err as { status?: number }).status;
  return status === undefined || status === 404 || status === 405 || status === 501 || status === 503;
};

async function withDriver<T>(remote: () => Promise<T>, local: () => T): Promise<T> {
  if (mode !== 'local') {
    try {
      const value = await remote();
      mode = 'remote';
      return value;
    } catch (err) {
      // Chỉ quyết định chuyển sang localStorage ở lần gọi đầu tiên; sau khi đã nối được backend, lỗi là lỗi thật
      if (mode === 'remote' || !isMissingEndpoint(err)) throw err;
      mode = 'local';
    }
  }
  return local();
}

const fromRecord = (r: SeatRecord): SeatInfo => ({
  maxSeats: r.maxSeats,
  availableSeats: r.availableSeats,
  status: r.status,
  heldByMe: r.heldByMe,
  holdExpiresAt: r.holdRemainingMs === undefined ? undefined : Date.now() + r.holdRemainingMs,
});

/** Tồn kho hiện tại của các ngày khởi hành (backend ghi nhận số chỗ ban đầu ở lần thấy đầu tiên). */
export const syncSeats = (departures: Departure[]): Promise<Record<string, SeatInfo>> =>
  withDriver(
    async () => {
      const records = await api.syncDepartures(
        getClientId(),
        departures.map(({ id, maxSeats, availableSeats }) => ({ id, maxSeats, availableSeats })),
      );
      return Object.fromEntries(records.map((r) => [r.id, fromRecord(r)]));
    },
    () => {
      const state = readInventory();
      const clientId = getClientId();
      return Object.fromEntries(departures.map((d) => [d.id, localInfo(d, state, clientId)]));
    },
  );

/**
 * Khách vào bước thanh toán: giữ chỗ cả ngày khởi hành trong HOLD_SECONDS.
 * Người khác không chọn/mua được ngày này cho đến khi thanh toán xong, hủy, hoặc hết hạn.
 */
export const holdSeats = async (departure: Departure, seats: number): Promise<HoldResult> => {
  const result = await withDriver<HoldResult>(
    async () => {
      const r = await api.holdDeparture(departure.id, getClientId(), seats);
      return r.ok ? { ok: true, expiresAt: Date.now() + r.ttlMs } : r;
    },
    () => localHold(departure, seats),
  );
  emit();
  return result;
};

/** Nhả chỗ đang giữ của khách này (quay lại, đóng modal, hết giờ). Không đụng tới lượt giữ của người khác. */
export const releaseSeats = async (departureId: string): Promise<void> => {
  await withDriver(
    async () => {
      await api.releaseDeparture(departureId, getClientId());
    },
    () => localRelease(departureId),
  );
  emit();
};

/** Thanh toán thành công: trừ chỗ và nhả giữ chỗ. Trả về false nếu lượt giữ chỗ đã mất (hết hạn / bị người khác chiếm). */
export const commitSeats = async (departure: Departure, seats: number): Promise<boolean> => {
  const ok = await withDriver(
    async () => (await api.commitDeparture(departure.id, getClientId(), seats)).ok,
    () => localCommit(departure, seats),
  );
  emit();
  return ok;
};

/** Hủy booking: trả chỗ về lại ngày khởi hành. */
export const returnSeats = async (departureId: string, seats: number): Promise<void> => {
  await withDriver(
    async () => {
      await api.returnDeparture(departureId, seats);
    },
    () => localReturn(departureId, seats),
  );
  emit();
};
