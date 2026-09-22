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

export interface UserReview {
  id: string;
  tourId: string;
  authorEmail: string;
  rating: number;
  date: string;
  content: string;
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
  hidden?: boolean; // admin-only: ẩn tour khỏi trang người dùng
  isFeatured?: boolean; // admin-only: đánh dấu "Tour nổi bật" trên trang chủ

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
  /** Sức chứa tối đa của đoàn. */
  maxSeats: number;
  /** Số chỗ còn lại. Từ `buildDepartures` là số chỗ ban đầu; qua `useLiveDepartures` là số chỗ hiện tại sau khi trừ các booking. */
  availableSeats: number;
  legs: [DepartureLeg, DepartureLeg];
  prices: DeparturePrices;
}

/** Trạng thái một suất khởi hành sau khi tính số chỗ đã bán và người đang giữ chỗ. */
export type SeatStatus = 'available' | 'holding' | 'sold-out';

/** `Departure` kèm tồn kho thời gian thực: `availableSeats` đã trừ số chỗ đã bán. */
export interface LiveDeparture extends Departure {
  status: SeatStatus;
  /** Chính khách này đang giữ chỗ (khác với "người khác đang giữ"). */
  heldByMe: boolean;
  /** Mốc hết hạn giữ chỗ (ms epoch) khi `status === 'holding'` hoặc `heldByMe`. */
  holdExpiresAt?: number;
}

/** Một ngày khởi hành như backend lưu: chỗ tối đa, chỗ còn lại và (nếu có) lượt giữ chỗ đang chạy. */
export interface SeatRecord {
  id: string;
  maxSeats: number;
  availableSeats: number;
  status: SeatStatus;
  /** Lượt giữ chỗ đang chạy là của chính khách gọi API. */
  heldByMe: boolean;
  /** Còn bao nhiêu ms nữa lượt giữ chỗ hết hạn (tính theo đồng hồ server, tránh lệch giờ với máy khách). */
  holdRemainingMs?: number;
}

export type HoldResponse = { ok: true; ttlMs: number } | { ok: false; reason: 'held' | 'sold-out' | 'not-enough' };

export interface AddOnService {
  id: string;
  label: string;
  description: string;
  /** Đơn giá: theo khách (người lớn + trẻ em) hoặc theo booking. */
  price: number;
  unit?: 'guest' | 'booking';
  /** Số lượng đã áp dụng khi đặt (điền lúc tạo booking). */
  quantity?: number;
}

export type PaymentMethod = 'vietqr' | 'momo' | 'vnpay' | 'card';
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

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string; // ISO date
  totalBookings: number;
  status: 'active' | 'locked';
  role: 'user' | 'admin';
  avatar?: string | null;
}

export type ArticleCategory = 'Tin tức' | 'Cẩm nang du lịch';

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: ArticleCategory;
  coverImage: string;
  excerpt: string;
  content: string;
  author: string;
  hidden?: boolean; // admin-only: ẩn bài viết khỏi Bảng tin
  createdAt: string; // ISO date
  /** 'draft': chỉ admin thấy. 'published': hiện ở Bảng tin từ `publishAt` trở đi (hẹn giờ đăng nếu ở tương lai). */
  status: ArticleStatus;
  publishAt: string | null; // ISO date — ngày đăng hiển thị cho người đọc
  pinned: boolean; // ghim lên đầu Bảng tin
  relatedTourIds: string[]; // tour gắn kèm bài viết (thẻ "Đặt ngay")
  views: number;
  // Tính từ bình luận/đánh giá, chỉ đọc
  ratingAvg: number;
  ratingCount: number;
  commentCount: number; // không tính bình luận đã ẩn
}

export type ArticleStatus = 'draft' | 'published';

export interface ArticleComment {
  id: string;
  articleId: string;
  userId: string;
  userName: string | null; // null nếu tài khoản đã bị xoá
  userRating: number | null; // số sao người viết bình luận đã chấm bài này
  articleTitle: string | null;
  content: string;
  hidden: boolean;
  createdAt: string; // ISO date
}

export interface ArticleRatingSummary {
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null; // số sao người dùng hiện tại đã chấm (null nếu chưa)
}

export interface ArticleFeedback extends ArticleRatingSummary {
  comments: ArticleComment[];
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
