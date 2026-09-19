import type { Departure, DepartureLeg, DeparturePrices, Tour, TransportKind } from '../types';

// ---------------------------------------------------------------------------
// Lịch khởi hành cố định của đoàn ("Gợi ý chuyến đi")
//
// File tour (PDF/Sheet) chỉ có giá, lịch trình và phương tiện chung — không có lịch đoàn cụ thể.
// Lịch đoàn được dựng ở đây từ chính dữ liệu của tour, và luôn LĂN THEO NGÀY HÔM NAY
// (từ ngày mai đến hết tháng thứ 3), nên không bao giờ hết hạn.
//
// ⚠ Số hiệu chuyến bay, hãng, giờ bay và số chỗ còn là DỮ LIỆU MẪU, sinh ổn định từ mã tour + ngày.
//   Khi có lịch thật, thay `buildDepartures()` (hoặc đọc từ API) — giao diện chỉ dùng kiểu `Departure`.
// ---------------------------------------------------------------------------

/** Số ngày tối thiểu từ hôm nay đến ngày đoàn khởi hành đầu tiên. */
const MIN_LEAD_DAYS = 2;
/** Lịch hiển thị: tháng hiện tại + N tháng tiếp theo. */
const MONTHS_AHEAD = 2;
/** Phụ thu phòng đơn ước tính = tỉ lệ này × giá người lớn (làm tròn 10.000đ), chỉ áp dụng tour có đêm lưu trú. */
const SINGLE_ROOM_RATE = 0.3;

// ---------------------------------------------------------------------------
// Ngày (chuỗi "YYYY-MM-DD", luôn theo giờ địa phương)
// ---------------------------------------------------------------------------
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (value: string, days: number): string => {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

/** "2026-09-21" → "T2, 21/09/2026" */
export const formatPillDate = (value: string): string => {
  const d = parseLocalDate(value);
  return `${WEEKDAYS[d.getDay()]}, ${formatDMY(value)}`;
};

/** "2026-09-21" → "21/09/2026" */
export const formatDMY = (value: string): string => value.split('-').reverse().join('/');

/** "2026-09" → "Tháng 9 2026" */
export const formatMonthTab = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return `Tháng ${m} ${y}`;
};

// ---------------------------------------------------------------------------
// Số ngẫu nhiên xác định (cùng tour + cùng ngày → luôn ra cùng kết quả)
// ---------------------------------------------------------------------------
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const pick = <T>(items: readonly T[], seed: number): T => items[seed % items.length];

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

// ---------------------------------------------------------------------------
// Tuyến đi theo điểm đến: đi từ đâu, bằng gì, mất bao lâu
// ---------------------------------------------------------------------------
interface Airport {
  city: string;
  iata: string;
}

const HAN: Airport = { city: 'Hà Nội', iata: 'HAN' };
const SGN: Airport = { city: 'TP. Hồ Chí Minh', iata: 'SGN' };

interface Route {
  origin: Airport;
  /** Sân bay đến (chỉ dùng khi tour có đón/tiễn sân bay). */
  airport?: Airport;
  flightMinutes?: number;
  /** Thời gian đi đường bộ, tính bằng phút (xe giường nằm / limousine / ô tô). */
  roadMinutes: number;
}

const ROUTES: Record<string, Route> = {
  sapa: { origin: HAN, roadMinutes: 360 },
  'ha long': { origin: HAN, roadMinutes: 150 },
  'ha giang': { origin: HAN, roadMinutes: 390 },
  'da lat': { origin: SGN, roadMinutes: 400 },
  'can tho': { origin: SGN, roadMinutes: 210 },
  'da nang': { origin: HAN, airport: { city: 'Đà Nẵng', iata: 'DAD' }, flightMinutes: 85, roadMinutes: 0 },
  'phu quoc': { origin: SGN, airport: { city: 'Phú Quốc', iata: 'PQC' }, flightMinutes: 60, roadMinutes: 0 },
  'nha trang': { origin: SGN, airport: { city: 'Nha Trang', iata: 'CXR' }, flightMinutes: 65, roadMinutes: 0 },
  hue: { origin: HAN, airport: { city: 'Huế', iata: 'HUI' }, flightMinutes: 80, roadMinutes: 0 },
};

const FALLBACK_ROUTE: Route = { origin: HAN, roadMinutes: 240 };

const AIRLINES = [
  { code: 'VJ', name: 'Vietjet Air' },
  { code: 'VN', name: 'Vietnam Airlines' },
  { code: 'VU', name: 'Vietravel Airlines' },
] as const;

// ---------------------------------------------------------------------------
// Giờ giấc
// ---------------------------------------------------------------------------
const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const fromMinutes = (total: number): string => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const OUT_FLIGHT_SLOTS = ['06:10', '07:05', '08:05', '09:15'] as const;
const BACK_FLIGHT_SLOTS = ['16:30', '17:45', '18:15', '19:30'] as const;
const OUT_ROAD_SLOTS = ['06:30', '07:00', '07:30'] as const;
const BACK_ROAD_SLOTS = ['14:30', '15:30', '16:30'] as const;

/** Giờ xe đón ở hoạt động đầu tiên của ngày 1, nếu tour ghi rõ (vd. "06:30: Xe đón tại Hà Nội đi Sapa"). */
const pickupTimeOf = (tour: Tour): string | undefined => {
  const first = tour.itinerary[0]?.activities[0];
  return first?.time && /don|khoi hanh/.test(normalize(first.title)) ? first.time : undefined;
};

/** Giờ lên xe về ở ngày cuối, nếu tour ghi rõ (vd. "15:30: Lên xe về lại Hà Nội"). */
const returnTimeOf = (tour: Tour): string | undefined =>
  tour.itinerary[tour.itinerary.length - 1]?.activities.find((a) => a.time && /len xe|xe ve|ve lai/.test(normalize(a.title)))?.time;

// ---------------------------------------------------------------------------
// Loại phương tiện của tour
// ---------------------------------------------------------------------------
const isShortTrip = (tour: Tour) => tour.duration <= 1 && tour.nights === 0;

/** Tên thành phố xuất phát viết theo cách lịch trình hay ghi ("Hà Nội", "TP.HCM"). */
const ORIGIN_ALIASES: Record<string, string[]> = {
  HAN: ['ha noi'],
  SGN: ['tp.hcm', 'tphcm', 'ho chi minh', 'sai gon'],
};

const kindOf = (tour: Tour, route: Route): TransportKind => {
  if (isShortTrip(tour)) return 'local';
  const day1 = normalize(tour.itinerary[0]?.activities.map((a) => a.title).join(' ') ?? '');
  const text = normalize(`${tour.transport} ${tour.includes.join(' ')} ${tour.itinerary.flatMap((d) => d.activities.map((a) => a.title)).join(' ')}`);
  // Tour có "đón/tiễn sân bay" thì đoàn bay đến điểm đến
  if (route.airport && /san bay/.test(text) && !/ben xe/.test(text)) return 'flight';
  // Đường bộ chỉ khi lịch trình ngày 1 thật sự xuất phát từ thành phố gốc (vd. "Hà Nội - Sapa");
  // tour bắt đầu ngay tại điểm đến (Đà Lạt glamping, Cần Thơ - Cà Mau, du thuyền Hạ Long…) thì xe đón tại chỗ
  const startsAtOrigin = ORIGIN_ALIASES[route.origin.iata].some((alias) => day1.includes(alias));
  if (route.roadMinutes === 0 || !startsAtOrigin) return 'local';
  if (/limousine/.test(normalize(tour.transport))) return 'limousine';
  return 'coach';
};

const vehicleName = (tour: Tour, kind: TransportKind): string => {
  const t = normalize(tour.transport);
  if (kind === 'limousine' || /limousine/.test(t)) return /9 cho/.test(t) ? 'Limousine 9 chỗ' : 'Limousine VIP';
  if (/cabin/.test(t)) return 'Xe Cabin VIP';
  if (/giuong nam/.test(t)) return 'Xe giường nằm';
  return 'Xe du lịch đời mới';
};

// ---------------------------------------------------------------------------
// Chặng đi / về
// ---------------------------------------------------------------------------
const flightLegs = (tour: Tour, route: Route, date: string, returnDate: string, seed: number): [DepartureLeg, DepartureLeg] => {
  const airline = pick(AIRLINES, seed);
  const dest = route.airport!;
  const minutes = route.flightMinutes ?? 80;
  const outTime = pick(OUT_FLIGHT_SLOTS, seed >>> 3);
  const backTime = pick(BACK_FLIGHT_SLOTS, seed >>> 5);
  const number = (offset: number) => `${airline.code}${100 + ((seed >>> offset) % 880)}`;

  return [
    {
      label: 'Ngày đi',
      date,
      kind: 'flight',
      operator: airline.name,
      code: number(7),
      from: route.origin.city,
      fromCode: route.origin.iata,
      to: dest.city,
      toCode: dest.iata,
      departTime: outTime,
      arriveTime: fromMinutes(toMinutes(outTime) + minutes),
    },
    {
      label: 'Ngày về',
      date: returnDate,
      kind: 'flight',
      operator: airline.name,
      code: number(13),
      from: dest.city,
      fromCode: dest.iata,
      to: route.origin.city,
      toCode: route.origin.iata,
      departTime: backTime,
      arriveTime: fromMinutes(toMinutes(backTime) + minutes),
    },
  ];
};

const roadLegs = (tour: Tour, route: Route, kind: 'limousine' | 'coach', date: string, returnDate: string, seed: number): [DepartureLeg, DepartureLeg] => {
  const vehicle = vehicleName(tour, kind);
  const out = pickupTimeOf(tour) ?? pick(OUT_ROAD_SLOTS, seed >>> 3);
  const back = returnTimeOf(tour) ?? pick(BACK_ROAD_SLOTS, seed >>> 5);
  const destination = tour.destination;

  return [
    {
      label: 'Ngày đi',
      date,
      kind,
      operator: vehicle,
      from: route.origin.city,
      to: destination,
      departTime: out,
      arriveTime: fromMinutes(toMinutes(out) + route.roadMinutes),
    },
    {
      label: 'Ngày về',
      date: returnDate,
      kind,
      operator: vehicle,
      from: destination,
      to: route.origin.city,
      departTime: back,
      arriveTime: fromMinutes(toMinutes(back) + route.roadMinutes),
    },
  ];
};

/** Tour trong ngày / theo buổi (hoặc bắt đầu ngay tại điểm đến): xe đón tại điểm hẹn, giờ lấy từ lịch trình của tour. */
const localLegs = (tour: Tour, date: string, returnDate: string): [DepartureLeg, DepartureLeg] => {
  const range = tour.durationLabel?.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const start = pickupTimeOf(tour) ?? tour.itinerary[0]?.activities.find((a) => a.time)?.time ?? range?.[1] ?? '08:00';
  const lastDay = tour.itinerary[tour.itinerary.length - 1]?.activities.filter((a) => a.time);
  const end = range?.[2] ?? lastDay?.[lastDay.length - 1]?.time ?? '17:00';
  const vehicle = tour.transport || 'Xe du lịch';
  const leg = (label: string, day: string, departTime: string): DepartureLeg => ({
    label,
    date: day,
    kind: 'local',
    operator: vehicle,
    from: tour.destination,
    to: tour.destination,
    departTime,
    arriveTime: '',
  });

  return [leg('Giờ đón', date, start), leg('Kết thúc', returnDate, end)];
};

// ---------------------------------------------------------------------------
// Giá theo độ tuổi (đọc từ mục "Điều khoản" của tour)
// ---------------------------------------------------------------------------
export interface ChildPolicy {
  /** "Từ 5 - 11 tuổi" — độ tuổi tính giá trẻ em (rỗng nếu tour không ghi rõ). */
  childRange: string;
  /** "Dưới 5 tuổi" — độ tuổi được miễn phí (rỗng nếu không có). */
  freeRange: string;
}

export const getChildPolicy = (tour: Tour): ChildPolicy => {
  const terms = tour.cancellationPolicy;
  const age = terms.match(/(?:trẻ em|trẻ)\s*(?:dưới|<)\s*(\d+)\s*(?:t\b|tuổi)/i);
  if (age && /miễn phí|không khuyến khích/i.test(terms)) {
    const n = Number(age[1]);
    return { childRange: `Từ ${n} - 11 tuổi`, freeRange: /miễn phí/i.test(terms) ? `Dưới ${n} tuổi` : '' };
  }
  const height = terms.match(/(?:trẻ em|trẻ)\s*(?:dưới|<)\s*(1m2?)/i);
  if (height) {
    const free = /miễn phí/i.test(terms);
    return { childRange: free ? `Cao từ ${height[1]}` : `Cao dưới ${height[1]}`, freeRange: free ? `Cao dưới ${height[1]}` : '' };
  }
  return { childRange: '', freeRange: '' };
};

const pricesFor = (tour: Tour): DeparturePrices => {
  const adult = tour.discountPrice ?? tour.price;
  const policy = getChildPolicy(tour);
  return {
    adult,
    child: tour.childPrice,
    childRange: policy.childRange,
    freeRange: policy.freeRange,
    singleRoom: tour.nights > 0 ? Math.round((adult * SINGLE_ROOM_RATE) / 10000) * 10000 : undefined,
  };
};

// ---------------------------------------------------------------------------
// Sức chứa & số chỗ còn
// ---------------------------------------------------------------------------
const capacityOf = (tour: Tour): number => {
  const seats = Number(tour.transport.match(/(\d+)\s*chỗ/i)?.[1]);
  return seats > 0 ? seats : 20;
};

// ---------------------------------------------------------------------------
// Dựng lịch
// ---------------------------------------------------------------------------
export const monthKeyOf = (date: string): string => date.slice(0, 7);

const departureCode = (tour: Tour, date: string, kind: TransportKind, leg: DepartureLeg): string => {
  const [y, m, d] = date.split('-');
  const tag = kind === 'flight' ? leg.code?.slice(0, 2) : kind === 'limousine' ? 'LM' : kind === 'coach' ? 'XE' : 'OT';
  return `${tour.code ?? tour.id}-${d}${m}${y.slice(2)}${tag}`;
};

/**
 * Lịch khởi hành của đoàn cho một tour, sắp theo ngày tăng dần.
 * Mỗi tour chạy mỗi tuần vào một thứ cố định (tuỳ mã tour) trong khoảng từ hôm nay đến hết tháng thứ 3.
 */
export const buildDepartures = (tour: Tour, today: Date = new Date()): Departure[] => {
  const route = ROUTES[normalize(tour.destination)] ?? FALLBACK_ROUTE;
  const kind = kindOf(tour, route);
  const weekday = hash(tour.id) % 7;
  const capacity = capacityOf(tour);
  const prices = pricesFor(tour);

  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() + MIN_LEAD_DAYS);
  const last = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD + 1, 0);
  // Chuyển đến đúng thứ khởi hành của tour
  first.setDate(first.getDate() + ((weekday - first.getDay() + 7) % 7));

  const departures: Departure[] = [];
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 7)) {
    const date = toDateString(d);
    const returnDate = addDays(date, Math.max(tour.duration - 1, 0));
    const seed = hash(`${tour.id}|${date}`);

    const [outbound, inbound] =
      kind === 'flight'
        ? flightLegs(tour, route, date, returnDate, seed)
        : kind === 'local'
          ? localLegs(tour, date, returnDate)
          : roadLegs(tour, route, kind, date, returnDate, seed);

    // Khoảng 1/10 đoàn đã kín chỗ; còn lại còn từ 2 chỗ đến gần hết sức chứa
    const soldOut = seed % 10 === 0;
    const seatsLeft = soldOut ? 0 : 2 + ((seed >>> 9) % Math.max(capacity - 1, 1));

    departures.push({
      id: departureCode(tour, date, kind, outbound),
      date,
      returnDate,
      kind,
      departFrom: kind === 'local' ? tour.destination : route.origin.city,
      seatsLeft: Math.min(seatsLeft, capacity),
      legs: [outbound, inbound],
      prices,
    });
  }
  return departures;
};
