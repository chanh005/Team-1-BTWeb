import React from 'react';
import type { Coordinate, ItineraryDay, StopType } from '../../types';
import type { ChuyenDi, DiaDiem, LichTrinhChuyenDi } from './types';

// Only orders whose payment succeeded have a trip. The API already filters on this; the check is repeated here so
// an unpaid / pending / failed order can never show up in "Chuyến đi của tôi", whatever the server sends.
export const PAID_STATUSES: readonly string[] = ['upcoming', 'confirmed', 'completed', 'cancelled'];

export type TripPhase = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

/** Local date at 00:00 (a bare "YYYY-MM-DD" would be read as UTC and can land on the wrong day). */
const localDate = (iso: string) => new Date(`${iso}T00:00:00`);

export const departureMoment = (trip: ChuyenDi): Date => new Date(`${trip.ngayKhoiHanh}T${trip.gioKhoiHanh || '00:00'}:00`);
export const endMoment = (trip: ChuyenDi): Date => new Date(`${trip.ngayKetThuc}T23:59:59`);

/** `status` is the order's current status (the live booking list is fresher than the trip snapshot). */
export function tripPhase(trip: ChuyenDi, status: string, now = Date.now()): TripPhase {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed' || endMoment(trip).getTime() < now) return 'completed';
  if (departureMoment(trip).getTime() <= now) return 'ongoing';
  return 'upcoming';
}

export const fmtDate = (iso: string) => localDate(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtDateLong = (iso: string) =>
  localDate(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtDateShort = (iso: string) => localDate(iso).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

export const durationLabel = (trip: ChuyenDi) => `${trip.soNgay} ngày ${trip.soDem} đêm`;

export const paymentLabel = (method: string) => (method === 'vietqr' ? 'VietQR' : method === 'momo' ? 'Ví MoMo' : method === 'card' ? 'Thẻ quốc tế' : method);

export const qrImageUrl = (data: string, size = 160) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(data)}`;

export const mapsUrl = (place: Pick<DiaDiem, 'tenDiaDiem' | 'viDo' | 'kinhDo'>): string =>
  place.viDo != null && place.kinhDo != null
    ? `https://www.google.com/maps/search/?api=1&query=${place.viDo},${place.kinhDo}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.tenDiaDiem)}`;

export const PLACE_ICON: Record<string, string> = { airport: '✈️', hotel: '🏨', attraction: '🏞️', restaurant: '🍜', stop: '📍' };
export const placeIcon = (type: string | null | undefined) => PLACE_ICON[type ?? ''] ?? '📍';

/** Schedule rows grouped by day, in order. */
export function groupByDay(rows: LichTrinhChuyenDi[]): { ngayThu: number; ngay: string; rows: LichTrinhChuyenDi[] }[] {
  const days = new Map<number, { ngayThu: number; ngay: string; rows: LichTrinhChuyenDi[] }>();
  for (const r of rows) {
    if (!days.has(r.ngayThu)) days.set(r.ngayThu, { ngayThu: r.ngayThu, ngay: r.ngay, rows: [] });
    days.get(r.ngayThu)!.rows.push(r);
  }
  return [...days.values()].sort((a, b) => a.ngayThu - b.ngayThu);
}

const MOVE_WORDS = /khởi hành|di chuyển|xe đưa|xe đón|đón khách|bay|chuyến bay|tàu|ca nô|cáp treo|limousine|xe giường|sân bay|trả khách|về lại|đưa đoàn/i;

/** The legs of the trip that are about getting somewhere: airports/stops and rows whose text mentions a vehicle. */
export const travelLegs = (rows: LichTrinhChuyenDi[]): LichTrinhChuyenDi[] =>
  rows.filter((r) => r.diaDiem?.loaiDiaDiem === 'airport' || r.diaDiem?.loaiDiaDiem === 'stop' || MOVE_WORDS.test(r.tieuDe));

export interface Destination {
  place: DiaDiem;
  days: number[]; // trip days on which the place is visited
  activity: string; // what happens there (title of the first schedule row)
  note: string | null;
}

/** The places of the trip worth naming: sights and food stops, in order of first visit (airports, hotels and pick-up points are covered elsewhere). */
export function destinationsOf(rows: LichTrinhChuyenDi[]): { sights: Destination[]; food: Destination[] } {
  const found = new Map<string, Destination>();
  for (const r of rows) {
    const place = r.diaDiem;
    if (!place || (place.loaiDiaDiem !== 'attraction' && place.loaiDiaDiem !== 'restaurant')) continue;
    const seen = found.get(place.maDiaDiem);
    if (!seen) found.set(place.maDiaDiem, { place, days: [r.ngayThu], activity: r.tieuDe, note: r.moTa });
    else if (!seen.days.includes(r.ngayThu)) seen.days.push(r.ngayThu);
  }
  const all = [...found.values()];
  return {
    sights: all.filter((d) => d.place.loaiDiaDiem === 'attraction'),
    food: all.filter((d) => d.place.loaiDiaDiem === 'restaurant'),
  };
}

const STOP_TYPES: string[] = ['airport', 'hotel', 'attraction', 'restaurant', 'stop'];
const asStopType = (type: string | null): StopType => (STOP_TYPES.includes(type ?? '') ? (type as StopType) : 'stop');

/** The schedule in the shape the shared InteractiveMap expects (only rows that have coordinates become map stops). */
export function mapDataOf(rows: LichTrinhChuyenDi[]): { route: Coordinate[]; itinerary: ItineraryDay[] } {
  const toCoordinate = (d: DiaDiem): Coordinate => ({ lat: d.viDo as number, lng: d.kinhDo as number, name: d.tenDiaDiem, type: asStopType(d.loaiDiaDiem) });
  const hasCoordinates = (r: LichTrinhChuyenDi) => r.diaDiem != null && r.diaDiem.viDo != null && r.diaDiem.kinhDo != null;

  const route = rows
    .filter(hasCoordinates)
    .map((r) => toCoordinate(r.diaDiem!))
    .filter((c, i, all) => i === 0 || c.name !== all[i - 1].name);

  const itinerary: ItineraryDay[] = groupByDay(rows).map((day) => ({
    day: day.ngayThu,
    title: `Ngày ${day.ngayThu}`,
    meals: [],
    activities: day.rows.map((r) => ({
      time: r.gio ?? '',
      title: r.tieuDe,
      description: r.moTa ?? '',
      location: hasCoordinates(r) ? toCoordinate(r.diaDiem!) : undefined,
    })),
  }));
  return { route, itinerary };
}

/** The last timed row of the last day: when the programme ends and guests are dropped off. */
export function endOfProgram(rows: LichTrinhChuyenDi[]): LichTrinhChuyenDi | null {
  const days = groupByDay(rows);
  const lastDay = days[days.length - 1];
  return lastDay ? [...lastDay.rows].reverse().find((r) => r.gio) ?? null : null;
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function useCountdown(target: Date): Countdown {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: diff <= 0,
  };
}
