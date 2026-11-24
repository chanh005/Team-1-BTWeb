import type { SellerTourFull } from '../api';

// Dữ liệu của form Đăng tour / Sửa tour: ô số giữ dạng chuỗi để người dùng gõ tự do, chuyển sang số khi gửi.

export interface DayForm {
  title: string;
  description: string;
  has_breakfast: boolean;
  has_lunch: boolean;
  has_dinner: boolean;
}

export interface DepartureForm {
  id: number | null; // null = ngày mới chưa lưu
  departure_date: string;
  price: string; // giá riêng, rỗng = dùng giá chung
  max_seats: string;
  booked_seats: number; // chỉ đọc: chỗ đã được xác nhận
  booking_deadline: string;
}

export interface TourFormState {
  name: string;
  destination: string;
  departure: string;
  duration: string;
  nights: string;
  transport: string;
  hotelStars: string;
  groupSizeTags: string[];
  shortDescription: string;
  coverImage: string;
  images: string[];
  itinerary: DayForm[];
  price: string;
  childPrice: string;
  departures: DepartureForm[];
  includes: string; // mỗi dòng một mục
  excludes: string;
  cancellationPolicy: string;
  child_policy: string;
  notes: string;
}

export const GROUP_OPTIONS = [
  { value: 'Solo', label: 'Đi 1 mình' },
  { value: 'Cặp đôi', label: 'Cặp đôi' },
  { value: 'Gia đình', label: 'Gia đình' },
  { value: 'Nhóm bạn', label: 'Nhóm bạn' },
];

export const TRANSPORT_OPTIONS = ['Xe ô tô du lịch', 'Xe giường nằm', 'Limousine', 'Máy bay', 'Máy bay + Xe du lịch', 'Tàu hỏa', 'Tàu / Ca nô', 'Khác'];

export const HOTEL_OPTIONS = [
  { value: '0', label: 'Không lưu trú' },
  { value: '3', label: '3 sao' },
  { value: '4', label: '4 sao' },
  { value: '5', label: '5 sao' },
];

export const emptyDay = (): DayForm => ({ title: '', description: '', has_breakfast: false, has_lunch: false, has_dinner: false });
export const emptyDeparture = (): DepartureForm => ({ id: null, departure_date: '', price: '', max_seats: '', booked_seats: 0, booking_deadline: '' });

export const emptyForm = (): TourFormState => ({
  name: '', destination: '', departure: '', duration: '', nights: '', transport: TRANSPORT_OPTIONS[0], hotelStars: '0', groupSizeTags: [],
  shortDescription: '', coverImage: '', images: [], itinerary: [emptyDay()], price: '', childPrice: '', departures: [emptyDeparture()],
  includes: '', excludes: '', cancellationPolicy: '', child_policy: '', notes: '',
});

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Dữ liệu server → state của form (dùng khi mở tour để sửa và sau mỗi lần lưu). */
export function fromTour(t: SellerTourFull): TourFormState {
  return {
    name: t.name ?? '', destination: t.destination ?? '', departure: t.departure ?? '',
    duration: t.duration && t.name ? String(t.duration) : '', nights: t.name ? str(t.nights) : '',
    transport: t.transport || TRANSPORT_OPTIONS[0], hotelStars: String(t.hotelStars ?? 0), groupSizeTags: t.groupSizeTags ?? [],
    shortDescription: t.shortDescription ?? '', coverImage: t.coverImage ?? '', images: t.images ?? [],
    itinerary: t.itinerary.length
      ? t.itinerary.map((d) => ({ title: d.title, description: d.description, has_breakfast: d.has_breakfast, has_lunch: d.has_lunch, has_dinner: d.has_dinner }))
      : [emptyDay()],
    price: t.price > 0 ? String(t.price) : '', childPrice: str(t.childPrice),
    departures: t.departures.length
      ? t.departures.map((d) => ({ id: d.id, departure_date: d.departure_date, price: str(d.price), max_seats: String(d.max_seats), booked_seats: d.booked_seats, booking_deadline: d.booking_deadline ?? '' }))
      : [emptyDeparture()],
    includes: (t.includes ?? []).join('\n'), excludes: (t.excludes ?? []).join('\n'),
    cancellationPolicy: t.cancellationPolicy ?? '', child_policy: t.child_policy ?? '', notes: t.notes ?? '',
  };
}

const num = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const rowIsEmpty = (d: DepartureForm) => d.id === null && !d.departure_date && !d.price && !d.max_seats && !d.booking_deadline;

/**
 * State của form → nội dung gửi lên server. Ô số bỏ trống thì không gửi (server giữ nguyên giá trị cũ, bản nháp không cần đủ).
 * `rowIndexes[i]` = vị trí trong form của ngày khởi hành thứ i được gửi (dòng trống hoàn toàn được bỏ qua),
 * để chuyển lỗi `departures[i].…` của server về đúng dòng.
 */
export function toPayload(f: TourFormState): { body: Record<string, unknown>; rowIndexes: number[] } {
  const rowIndexes: number[] = [];
  const departures = f.departures.flatMap((d, i) => {
    if (rowIsEmpty(d)) return [];
    rowIndexes.push(i);
    return [{
      id: d.id, departure_date: d.departure_date, price: d.price.trim() === '' ? null : Number(d.price),
      max_seats: d.max_seats.trim() === '' ? null : Number(d.max_seats), booking_deadline: d.booking_deadline || null,
    }];
  });
  const body: Record<string, unknown> = {
    name: f.name, destination: f.destination, departure: f.departure, transport: f.transport, hotelStars: Number(f.hotelStars),
    groupSizeTags: f.groupSizeTags, shortDescription: f.shortDescription, description: f.shortDescription,
    coverImage: f.coverImage, images: f.images, itinerary: f.itinerary,
    childPrice: f.childPrice.trim() === '' ? null : Number(f.childPrice), departures,
    includes: lines(f.includes), excludes: lines(f.excludes), cancellationPolicy: f.cancellationPolicy, child_policy: f.child_policy, notes: f.notes,
  };
  for (const [k, v] of [['duration', num(f.duration)], ['nights', num(f.nights)], ['price', num(f.price)]] as const) if (v !== undefined) body[k] = v;
  return { body, rowIndexes };
}

/** Lỗi của server (`departures[2].max_seats`…) → khóa theo vị trí dòng trong form. */
export function mapErrors(fields: Record<string, string>, rowIndexes: number[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msg] of Object.entries(fields)) {
    const m = key.match(/^departures\[(\d+)\](.*)$/);
    out[m ? `departures[${rowIndexes[Number(m[1])] ?? Number(m[1])}]${m[2]}` : key] = msg;
  }
  return out;
}

/** Khóa lỗi thuộc phần nào của form (để đánh dấu đỏ trên menu bên trái). */
export const SECTION_OF = (key: string): 'basic' | 'images' | 'itinerary' | 'price' | 'policy' => {
  if (['coverImage', 'images'].includes(key)) return 'images';
  if (key === 'itinerary') return 'itinerary';
  if (key.startsWith('departures') || ['price', 'childPrice', 'includes', 'excludes'].includes(key)) return 'price';
  if (['cancellationPolicy', 'child_policy', 'notes'].includes(key)) return 'policy';
  return 'basic';
};
