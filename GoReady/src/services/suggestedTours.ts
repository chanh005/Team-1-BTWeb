import type { Activity, ItineraryDay, Tour } from '../types';
import { parseCsv } from '../utils/csv';
import { placeholderImage } from '../utils/image';

// ---------------------------------------------------------------------------
// Data source
//   1. VITE_SUGGESTED_TOURS_URL — a Google Sheets link (edit/share link or a
//      "Publish to web" CSV link). Must be shared as "anyone with the link".
//   2. /data/suggested-tours.csv — bundled fallback, used when (1) is unset or fails.
// ---------------------------------------------------------------------------
const REMOTE_SOURCE = import.meta.env.VITE_SUGGESTED_TOURS_URL?.trim();
const LOCAL_SOURCE = `${import.meta.env.BASE_URL}data/suggested-tours.csv`;
const IMAGE_BASE = import.meta.env.VITE_TOUR_IMAGE_BASE ?? `${import.meta.env.BASE_URL}images/tours/`;

/** Turns a Google Sheets edit/share link into its CSV export URL; other URLs pass through untouched. */
export const toCsvUrl = (source: string): string => {
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(source)) return source;
  if (/\/pub\b|[?&]output=csv|[?&]format=csv|tqx=out:csv/.test(source)) return source;
  const id = source.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];
  if (!id || id === 'e') return source;
  const gid = source.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1${gid ? `&gid=${gid}` : ''}`;
};

// ---------------------------------------------------------------------------
// Column mapping (by normalized header name, so column order/extra columns don't matter)
// ---------------------------------------------------------------------------
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const COLUMNS = {
  destination: 'diadiem',
  code: 'ma',
  name: 'tentour',
  category: 'danhmuctour',
  duration: 'thoigian',
  transport: 'phuongtien',
  adultPrice: 'gianguoilon',
  childPrice: 'giatreem',
  summary: 'motangan',
  itinerary: 'lichtrinh',
  includes: 'baogom',
  excludes: 'khongbaogom',
  keywords: 'tukhoa',
  terms: 'dieukhoan',
  images: 'anhtour',
} as const;

type ColumnKey = keyof typeof COLUMNS;

const indexColumns = (header: string[]): Record<ColumnKey, number> => {
  const names = header.map(normalize);
  const result = {} as Record<ColumnKey, number>;
  (Object.keys(COLUMNS) as ColumnKey[]).forEach((key) => {
    const alias = COLUMNS[key];
    let idx = names.indexOf(alias);
    // The location header may carry a stray prefix (e.g. "t Địa điểm")
    if (idx < 0 && key === 'destination') idx = names.findIndex((n) => n.endsWith(alias));
    result[key] = idx;
  });
  return result;
};

// ---------------------------------------------------------------------------
// Cell parsers
// ---------------------------------------------------------------------------
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** "ĐÀ NẴNG" → "Đà Nẵng" (only touches values that are fully upper-case). */
const titleCase = (s: string) =>
  s === s.toLocaleUpperCase('vi')
    ? s
        .toLocaleLowerCase('vi')
        .split(' ')
        .map((w) => w.charAt(0).toLocaleUpperCase('vi') + w.slice(1))
        .join(' ')
    : s;

/** "1.850.000 đ" → 1850000. Text such as "Không áp dụng (<14t)" → undefined. */
const parseVnd = (raw: string): number | undefined => {
  if (!/^[\d.,\s]+(?:đ|vnđ|vnd)?$/i.test(raw)) return undefined;
  const n = Number(raw.replace(/\D/g, ''));
  return n > 0 ? n : undefined;
};

/** "2 ngày 1 đêm" / "1 ngày (08:00 - 16:30)" / "1 buổi (17:00 - 21:00)" */
const parseDuration = (raw: string): { days: number; nights: number } => {
  const days = Number(raw.match(/(\d+)\s*ngày/i)?.[1] ?? 1);
  const nights = Number(raw.match(/(\d+)\s*đêm/i)?.[1] ?? 0);
  return { days: days || 1, nights };
};

/** Splits on ". - " bullets when the cell uses them, otherwise on top-level commas (ignoring "(...)"). */
const parseList = (raw: string): string[] => {
  const text = clean(raw);
  if (!text) return [];
  let parts: string[];
  if (/^-\s/.test(text) || /\.\s+-\s+/.test(text)) {
    parts = text.replace(/^-\s+/, '').split(/\.\s+-\s+/);
  } else {
    parts = [];
    let depth = 0;
    let current = '';
    for (const ch of text) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current);
  }
  return parts.map((p) => p.replace(/[.\s]+$/, '').trim()).filter(Boolean);
};

const parseHotelStars = (includes: string): Tour['hotelStars'] => {
  // "KS 3 sao", "Resort 5 sao", "KS 2-3 sao" (upper bound wins)
  const stars = Number(includes.match(/(?:\d\s*-\s*)?(\d)\s*sao/i)?.[1] ?? 0);
  return stars >= 3 && stars <= 5 ? (stars as 3 | 4 | 5) : 0;
};

const resolveImage = (file: string): string =>
  /^(https?:)?\/\/|^\/|^data:/.test(file) ? file : `${IMAGE_BASE}${encodeURIComponent(file)}`;

/** Sorted by filename so "x-1" is the cover even if the sheet lists "x-2" first. */
const parseImages = (raw: string): string[] =>
  raw
    .split(/[\s,;]+/)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map(resolveImage);

// ---------------------------------------------------------------------------
// Itinerary: free text → ItineraryDay[]
//   "N1: 08:00: Đón khách - ... (Ăn T/T). N2: ..."  |  "08:00: ... 09:00: ..." (single day)
// ---------------------------------------------------------------------------
const DAY_RE = /(?:^|[\s.])N(\d{1,2})\s*:/g;
const TIME_RE = /\b(\d{1,2}):\s?(\d{2})\b:?/g;
const MEAL_RE = /\(\s*Ăn\s+[^)]*\)\.?/gi;

/** "(Ăn S/T/T)" → Sáng, Trưa, Tối — letters are in meal order, so the 1st "T" is lunch and the 2nd is dinner. */
const parseMeals = (text: string): string[] => {
  const marker = text.match(/\(\s*Ăn\s+([^)]*)\)/i)?.[1];
  if (!marker) return [];
  const meals: string[] = [];
  let seenT = 0;
  for (const letter of marker.toUpperCase().split(/[^A-Z]+/).filter(Boolean)) {
    if (letter === 'S') meals.push('Sáng');
    else if (letter === 'T') meals.push(seenT++ === 0 ? 'Trưa' : 'Tối');
  }
  return meals;
};

const tidy = (s: string) => clean(s).replace(/^[\s\-–.:]+|[\s\-–.:,;]+$/g, '');

const untimed = (text: string): Activity[] =>
  text
    .split(/\s+-\s+/)
    .map(tidy)
    .filter(Boolean)
    .map((title) => ({ time: '', title, description: '' }));

const parseActivities = (text: string): Activity[] => {
  const times = [...text.matchAll(TIME_RE)];
  if (times.length === 0) return untimed(text);

  const activities = untimed(text.slice(0, times[0].index));
  times.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = times[i + 1]?.index ?? text.length;
    const title = tidy(text.slice(start, end));
    if (title) activities.push({ time: `${m[1].padStart(2, '0')}:${m[2]}`, title, description: '' });
  });
  return activities;
};

export const parseItinerary = (raw: string): ItineraryDay[] => {
  const text = clean(raw);
  if (!text) return [];

  const dayMarkers = [...text.matchAll(DAY_RE)];
  const chunks =
    dayMarkers.length > 0
      ? dayMarkers.map((m, i) => ({
          day: Number(m[1]),
          text: text.slice((m.index ?? 0) + m[0].length, dayMarkers[i + 1]?.index ?? text.length),
        }))
      : [{ day: 1, text }];

  return chunks.map(({ day, text: body }) => ({
    day,
    title: dayMarkers.length > 0 ? `Ngày ${day}` : 'Lịch trình trong ngày',
    activities: parseActivities(body.replace(MEAL_RE, ' ')),
    meals: parseMeals(body),
  }));
};

// ---------------------------------------------------------------------------
// CSV text → Tour[]
// ---------------------------------------------------------------------------
export const parseSuggestedTours = (csv: string): Tour[] => {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const col = indexColumns(header);
  // A non-sheet response (e.g. Google's HTML login page) has no recognisable header
  if (col.code < 0 || col.name < 0 || col.adultPrice < 0) return [];

  const cell = (row: string[], key: ColumnKey) => (col[key] >= 0 ? row[col[key]] ?? '' : '');

  const tours: Tour[] = [];
  const seen = new Set<string>();
  // "Địa điểm" is a merged cell in the sheet: only the first row of each group carries the value
  let destination = '';

  for (const row of rows) {
    const groupLabel = clean(cell(row, 'destination'));
    if (groupLabel) destination = titleCase(groupLabel);

    const code = clean(cell(row, 'code')).toUpperCase();
    const name = clean(cell(row, 'name'));
    if (!code || !name || seen.has(code)) continue;

    const price = parseVnd(clean(cell(row, 'adultPrice')));
    if (price === undefined) {
      console.warn(`[suggested-tours] Bỏ qua ${code}: giá người lớn không hợp lệ`);
      continue;
    }
    seen.add(code);

    const durationLabel = clean(cell(row, 'duration'));
    const { days, nights } = parseDuration(durationLabel);
    const includesRaw = cell(row, 'includes');
    const summary = clean(cell(row, 'summary'));
    const images = parseImages(cell(row, 'images'));

    tours.push({
      id: code,
      slug: `${slugify(name)}-${code.toLowerCase()}`,
      name,
      destination,
      country: 'Việt Nam',
      region: 'Việt Nam',
      coverImage: images[0] ?? placeholderImage(destination),
      gallery: images.slice(1),
      shortDescription: summary,
      description: summary,
      price,
      duration: days,
      nights,
      departure: destination,
      hotelStars: parseHotelStars(includesRaw),
      transport: clean(cell(row, 'transport')),
      styleTags: [],
      groupSizeTags: [],
      rating: 0,
      reviewCount: 0,
      bookingCount: 0,
      itinerary: parseItinerary(cell(row, 'itinerary')),
      includes: parseList(includesRaw),
      excludes: parseList(cell(row, 'excludes')),
      reviews: [],
      highlights: [],
      cancellationPolicy: clean(cell(row, 'terms')) || 'Vui lòng liên hệ GoReady để biết chính sách hoàn hủy.',
      route: [],
      code,
      durationLabel,
      childPrice: parseVnd(clean(cell(row, 'childPrice'))),
      category: clean(cell(row, 'category')),
      keywords: cell(row, 'keywords')
        .split(',')
        .map(clean)
        .filter(Boolean),
    });
  }

  return tours;
};

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------
const fetchText = async (url: string, signal?: AbortSignal): Promise<string> => {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Không tải được dữ liệu (HTTP ${res.status})`);
  return res.text();
};

/** Loads suggested tours from the configured Google Sheet, falling back to the bundled CSV. */
export const fetchSuggestedTours = async (signal?: AbortSignal): Promise<Tour[]> => {
  const sources = [REMOTE_SOURCE ? toCsvUrl(REMOTE_SOURCE) : '', LOCAL_SOURCE].filter(Boolean);
  let lastError: unknown = new Error('Chưa cấu hình nguồn dữ liệu tour gợi ý');

  for (const url of sources) {
    try {
      const tours = parseSuggestedTours(await fetchText(url, signal));
      if (tours.length > 0) return tours;
      lastError = new Error('Nguồn dữ liệu không có tour hợp lệ');
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
      console.warn(`[suggested-tours] Lỗi khi đọc ${url}`, err);
    }
  }
  throw lastError;
};
