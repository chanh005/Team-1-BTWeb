import { useEffect, useMemo, useState } from 'react';
import type { Departure, LiveDeparture } from '../types';
import { subscribeSeatChanges, syncSeats, type SeatInfo } from '../services/seatInventory';

const POLL_MS = 3000;

/**
 * Các ngày khởi hành kèm tồn kho thời gian thực: `availableSeats` hiện tại, đang có người giữ chỗ hay đã hết vé.
 * Hỏi lại backend mỗi vài giây, ngay khi chính mình đổi tồn kho, và khi một lượt giữ chỗ hết hạn.
 * `ready` chỉ bật sau khi có dữ liệu thật cho đúng danh sách này; trước đó `availableSeats` là số chỗ ban đầu.
 */
export function useLiveDepartures(departures: Departure[]): { departures: LiveDeparture[]; ready: boolean } {
  const [snapshot, setSnapshot] = useState<{ for: Departure[]; seats: Record<string, SeatInfo> } | null>(null);

  useEffect(() => {
    if (departures.length === 0) return;
    let cancelled = false;
    let timer: number | undefined;

    const refresh = async () => {
      try {
        const seats = await syncSeats(departures);
        if (cancelled) return;
        setSnapshot({ for: departures, seats });
        // Lượt giữ chỗ hết hạn thì ngày đó phải mở lại ngay, không đợi lần hỏi kế tiếp
        const expiries = Object.values(seats).flatMap((s) => (s.holdExpiresAt ? [s.holdExpiresAt] : []));
        window.clearTimeout(timer);
        if (expiries.length > 0) timer = window.setTimeout(refresh, Math.max(Math.min(...expiries) - Date.now(), 0) + 300);
      } catch {
        // Mất kết nối thoáng qua: giữ dữ liệu cũ, lần hỏi sau sẽ thử lại
      }
    };

    refresh();
    const poll = window.setInterval(refresh, POLL_MS);
    const unsubscribe = subscribeSeatChanges(refresh);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [departures]);

  return useMemo(() => {
    const seats = snapshot?.for === departures ? snapshot.seats : null;
    return {
      ready: seats !== null || departures.length === 0,
      departures: departures.map((d): LiveDeparture => {
        const info = seats?.[d.id];
        return info
          ? { ...d, ...info }
          : { ...d, status: d.availableSeats === 0 ? 'sold-out' : 'available', heldByMe: false };
      }),
    };
  }, [departures, snapshot]);
}
