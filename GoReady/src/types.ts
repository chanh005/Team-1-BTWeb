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
  hotelStars: 3 | 4 | 5;
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
