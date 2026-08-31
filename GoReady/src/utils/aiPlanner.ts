import type { AiPlannerRequest, AiPlannerResult, AiPlannerDayPlan } from '../types';

const MORNING_IDEAS = [
  'Dạo bộ khám phá khu phố trung tâm, thưởng thức cà phê địa phương',
  'Tham quan điểm di tích/văn hóa nổi bật nhất khu vực',
  'Trekking nhẹ nhàng ngắm cảnh thiên nhiên lúc bình minh',
  'Tham gia tour chợ địa phương, tìm hiểu đời sống bản địa',
  'Check-in điểm ngắm cảnh view đẹp nhất trước khi đông khách',
];

const AFTERNOON_IDEAS = [
  'Tự do khám phá các điểm tham quan lân cận',
  'Trải nghiệm hoạt động đặc trưng của vùng (biển, núi, sông...)',
  'Mua sắm đặc sản, quà lưu niệm tại khu chợ/trung tâm',
  'Thưởng thức ẩm thực địa phương tại quán ăn được đánh giá cao',
  'Nghỉ ngơi tại khách sạn/resort, tận hưởng tiện ích',
];

const EVENING_IDEAS = [
  'Dạo phố đêm, thưởng thức đặc sản đường phố',
  'Ngắm hoàng hôn tại điểm view đẹp, chụp ảnh lưu niệm',
  'Thưởng thức bữa tối tại nhà hàng đặc sản địa phương',
  'Thư giãn spa/massage sau một ngày khám phá',
  'Tự do khám phá cuộc sống về đêm của địa phương',
];

const CULTURAL_TIPS_POOL = [
  'Nên tôn trọng phong tục, trang phục lịch sự khi vào đền chùa/di tích.',
  'Học vài câu chào hỏi cơ bản bằng ngôn ngữ địa phương sẽ giúp chuyến đi thân thiện hơn.',
  'Luôn hỏi giá trước khi mua hàng tại các khu chợ truyền thống.',
  'Giữ gìn vệ sinh chung và tôn trọng văn hóa bản địa khi tham quan.',
  'Chuẩn bị tiền mặt mệnh giá nhỏ để thuận tiện thanh toán tại các điểm nhỏ lẻ.',
];

const SAVING_TIPS_POOL = [
  'Đặt vé máy bay và khách sạn trước 1-2 tháng để có giá tốt nhất.',
  'Di chuyển bằng phương tiện công cộng thay vì taxi để tiết kiệm chi phí.',
  'Ăn tại các quán địa phương thay vì nhà hàng du lịch để vừa rẻ vừa chuẩn vị.',
  'Theo dõi các đợt khuyến mãi combo vé + khách sạn trên GoReady.',
  'Chuẩn bị lịch trình rõ ràng để tránh phát sinh chi phí di chuyển thừa.',
];

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

export function generateAiItinerary(req: AiPlannerRequest): AiPlannerResult {
  const days = Math.max(1, Math.min(30, req.days || 1));
  const itinerary: AiPlannerDayPlan[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    morning: pick(MORNING_IDEAS, i + req.destination.length),
    afternoon: pick(AFTERNOON_IDEAS, i + req.destination.length + 1),
    evening: pick(EVENING_IDEAS, i + req.destination.length + 2),
  }));

  const budget = req.budget > 0 ? req.budget : days * 1500000;
  const transportPct = 0.3;
  const hotelPct = 0.35;
  const foodPct = 0.2;
  const ticketsPct = 0.15;

  const costBreakdown = [
    { label: 'Đi lại (vé máy bay/xe, di chuyển nội địa)', amount: Math.round(budget * transportPct) },
    { label: 'Khách sạn / Lưu trú', amount: Math.round(budget * hotelPct) },
    { label: 'Ăn uống', amount: Math.round(budget * foodPct) },
    { label: 'Vé tham quan & hoạt động', amount: Math.round(budget * ticketsPct) },
  ];
  const totalCost = costBreakdown.reduce((s, c) => s + c.amount, 0);

  const bestTimeMap: Record<string, string> = {
    'Biển đảo nghỉ dưỡng': 'Tháng 3 - 8 (mùa khô, biển lặng, nắng đẹp)',
    'Văn hóa & Lịch sử': 'Tháng 9 - 4 (thời tiết mát mẻ, dễ di chuyển tham quan)',
    'Khám phá & Trekking': 'Tháng 10 - 4 (khô ráo, thuận lợi cho các cung đường trekking)',
    'Nghỉ dưỡng gia đình': 'Quanh năm, tránh cao điểm lễ Tết để có giá tốt và ít đông đúc',
    'Ẩm thực đường phố': 'Quanh năm, ưu tiên mùa lễ hội địa phương để trải nghiệm trọn vẹn',
  };

  const seedBase = req.destination.length + days;
  const culturalTips = [0, 1, 2].map((i) => pick(CULTURAL_TIPS_POOL, seedBase + i));
  const savingTips = [0, 1, 2].map((i) => pick(SAVING_TIPS_POOL, seedBase + i + 1));

  return {
    destination: req.destination,
    days,
    itinerary,
    costBreakdown,
    totalCost,
    bestTime: bestTimeMap[req.style] ?? 'Quanh năm, tùy theo lịch trình cá nhân',
    culturalTips: Array.from(new Set(culturalTips)),
    savingTips: Array.from(new Set(savingTips)),
  };
}
