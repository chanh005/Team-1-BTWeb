// ==========================================================================
// GoReady — Core TypeScript type definitions
// ==========================================================================

export type StopType = 'airport' | 'hotel' | 'attraction' | 'restaurant' | 'stop';

export interface Coordinate {
  lat: number;
  lng: number;
  name: string;
  type: StopType;
}

export interface Activity {
  time: string; // e.g. "08:00"
  title: string;
  description: string;
  location?: Coordinate;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: Activity[];
  meals: string[]; // e.g. ["Sáng", "Trưa", "Tối"]
  accommodation?: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number; // 1-5
  date: string; // ISO date
  comment: string;
}

export type TravelStyle =
  | 'Biển đảo nghỉ dưỡng'
  | 'Văn hóa & Lịch sử'
  | 'Khám phá & Trekking'
  | 'Nghỉ dưỡng gia đình'
  | 'Ẩm thực đường phố';

export type GroupSizeTag = 'Solo' | 'Cặp đôi' | 'Gia đình' | 'Nhóm bạn';

export type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'rating';

export type BudgetRange = 'under-3' | '3-5' | '5-10' | 'over-10';

export type DurationRange = '1-2' | '3-4' | '5-plus';

export interface Tour {
  id: string;
  slug: string;
  name: string;
  destination: string;
  country: string;
  region: 'Việt Nam' | 'Quốc tế';
  coverImage: string;
  gallery: string[];
  shortDescription: string;
  description: string;
  price: number; // original price (VND)
  discountPrice?: number; // discounted price if any
  duration: number; // days
  nights: number;
  departure: string;
  hotelStars: 0 | 3 | 4 | 5; // 0 = no star-rated hotel in the package
  transport: string;
  styleTags: TravelStyle[];
  groupSizeTags: GroupSizeTag[];
  rating: number;
  reviewCount: number;
  bookingCount: number;
  itinerary: ItineraryDay[];
  includes: string[];
  excludes: string[];
  reviews: Review[];
  highlights: string[];
  cancellationPolicy: string;
  route: Coordinate[]; // full trip route (all days)

  // Optional fields, populated for tours loaded from the "Gợi ý chuyến đi" sheet
  code?: string; // sheet code, e.g. "SP01"
  durationLabel?: string; // raw duration text, e.g. "1 buổi (17:00 - 21:00)"
  childPrice?: number; // VND
  category?: string; // e.g. "Tour Miền Bắc"
  keywords?: string[];
}

// --- Lịch khởi hành cố định của đoàn (tour "Gợi ý chuyến đi") ---
export type TransportKind = 'flight' | 'limousine' | 'coach' | 'local';

/** Một chặng di chuyển của đoàn: chuyến bay, xe limousine/giường nằm, hoặc xe đón tại điểm hẹn. */
export interface DepartureLeg {
  label: string; // "Ngày đi" | "Ngày về" | "Giờ đón" | "Kết thúc"
  date: string; // "YYYY-MM-DD"
  kind: TransportKind;
  operator: string; // hãng bay hoặc loại xe
  code?: string; // số hiệu chuyến bay, vd. "VJ770"
  from: string;
  fromCode?: string; // mã sân bay
  to: string;
  toCode?: string;
  departTime: string; // "08:05"
  arriveTime: string; // "" với xe đón tại điểm hẹn
}

export interface DeparturePrices {
  adult: number;
  child?: number;
  childRange: string; // "Từ 5 - 11 tuổi"
  freeRange: string; // "Dưới 5 tuổi" — được miễn phí
  singleRoom?: number; // phụ thu phòng đơn
}

export interface Departure {
  id: string; // mã đoàn, vd. "DN01-210926VJ"
  date: string;
  returnDate: string;
  kind: TransportKind;
  departFrom: string;
  seatsLeft: number;
  legs: [DepartureLeg, DepartureLeg];
  prices: DeparturePrices;
}

export interface AddOnService {
  id: string;
  label: string;
  description: string;
  price: number;
}

export type PaymentMethod = 'vietqr' | 'momo' | 'card';
export type BookingStatus = 'confirmed' | 'upcoming' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  bookingCode: string;
  tourId: string;
  departureDate: string; // ISO date
  departureCode?: string; // mã đoàn (tour có lịch khởi hành cố định)
  adults: number;
  children: number;
  infants: number;
  addOns: AddOnService[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note?: string;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  createdAt: string;
  guideName: string;
  guidePhone: string;
  hotelName: string;
  pickupTime: string;
  pickupLocation: string;
}

export type ChecklistCategory = 'Giấy tờ tùy thân' | 'Quần áo & Giày dép' | 'Thuốc men & Y tế' | 'Thiết bị điện tử & Tiền tệ';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  checked: boolean;
  custom?: boolean;
}

export interface SearchFilterState {
  destination: string;
  dateFrom: string;
  groupSize: GroupSizeTag | 'all';
  budget: BudgetRange | 'all';
  styles: TravelStyle[];
  duration: DurationRange | 'all';
  sortBy: SortOption;
}

export interface AiPlannerRequest {
  destination: string;
  budget: number;
  days: number;
  style: TravelStyle;
  notes: string;
}

export interface AiPlannerDayPlan {
  day: number;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface AiPlannerCostItem {
  label: string;
  amount: number;
}

export interface AiPlannerResult {
  destination: string;
  days: number;
  itinerary: AiPlannerDayPlan[];
  costBreakdown: AiPlannerCostItem[];
  totalCost: number;
  bestTime: string;
  culturalTips: string[];
  savingTips: string[];
}
