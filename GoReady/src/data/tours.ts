import type { Tour, Coordinate, Review } from '../types';

// Verified-reachable Unsplash photo IDs (travel/nature/city scenes) used as a
// deterministic pool so every tour gets stable, real photographic imagery.
const PHOTO_POOL = [
  '1500835556837-99ac94a94552', '1476514525535-07fb3b4ae5f1', '1507525428034-b723cf961d3e',
  '1518684079-3c830dcef090', '1544644181-1484b3fdfc62', '1533105079780-92b9be482077',
  '1476673160081-cf065607f449', '1469854523086-cc02fe5d8800', '1523906834658-6e24ef2386f9',
  '1526481280693-3bfa7568e0f3', '1540541338287-41700207dee6', '1528181304800-259b08848526',
  '1440342359743-84fcb8c21f21', '1493246507139-91e8fad9978e', '1493558103817-58b2924bce98',
  '1502602898657-3e91760cbb34', '1494783367193-149034c05e8f', '1573790387438-4da905039392',
  '1554797589-7241bb691973', '1503917988258-f87a78e3c995', '1508009603885-50cf7c579365',
  '1517760444937-f6397edcbbcd', '1543832923-44667a44c804', '1470004914212-05527e49370b',
  '1553440569-bcc63803a83d', '1502920917128-1aa500764cbd', '1512100356356-de1b84283e18',
  '1567157577867-05ccb1388e66', '1503756234508-e32369269deb', '1483683804023-6ccdb62f86ef',
  '1528127269322-539801943592', '1520250497591-112f2f40a3f4', '1465146344425-f00d5f5c8f07',
  '1583417319070-4a69db38a482', '1548013146-72479768bada', '1508672019048-805c876b67e2',
  '1509644851169-2acc08aa25b5', '1552465011-b4e21bf6e79a', '1524492412937-b28074a5d7da',
  '1480796927426-f609979314bd', '1477587458883-47145ed94245', '1546484396-fb3fc6f95f98',
  '1494475673543-6a6a27143fc8',
];

const img = (seed: string, w = 1200, h = 800) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const id = PHOTO_POOL[hash % PHOTO_POOL.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80`;
};
const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const mkReviews = (names: [string, number, string, string][]): Review[] =>
  names.map(([author, rating, date, comment], i) => ({
    id: `rv-${author}-${i}`,
    author,
    avatar: avatar(author),
    rating,
    date,
    comment,
  }));

// ---------------------------------------------------------------------------
// 1. Phú Quốc
// ---------------------------------------------------------------------------
const phuQuocRoute: Coordinate[] = [
  { lat: 10.227, lng: 103.967, name: 'Sân bay Phú Quốc', type: 'airport' },
  { lat: 10.217, lng: 103.958, name: 'Khách sạn Sunset Sanato', type: 'hotel' },
  { lat: 10.037, lng: 104.01, name: 'Cáp treo Hòn Thơm', type: 'attraction' },
  { lat: 10.0195, lng: 104.0201, name: 'Bãi Sao', type: 'attraction' },
  { lat: 10.37, lng: 103.858, name: 'VinWonders & Safari', type: 'attraction' },
  { lat: 10.216, lng: 103.955, name: 'Chợ đêm Dinh Cậu', type: 'restaurant' },
];

const phuQuoc: Tour = {
  id: 'phu-quoc',
  slug: 'phu-quoc-thien-duong-bien-dao',
  name: 'Phú Quốc — Thiên Đường Biển Đảo',
  destination: 'Phú Quốc',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('phuquoc-cover'),
  gallery: [img('phuquoc-1'), img('phuquoc-2'), img('phuquoc-3'), img('phuquoc-4')],
  shortDescription: 'Nghỉ dưỡng biển cao cấp, cáp treo vượt biển dài nhất thế giới và hoàng hôn Dinh Cậu huyền ảo.',
  description:
    'Phú Quốc là hòn đảo ngọc của Việt Nam với những bãi biển cát trắng trải dài, làn nước trong xanh và hệ sinh thái đảo phong phú. Hành trình đưa bạn khám phá trọn vẹn từ VinWonders, cáp treo Hòn Thơm cho đến những bãi biển đẹp nhất Nam đảo.',
  price: 6990000,
  discountPrice: 5490000,
  duration: 4,
  nights: 3,
  departure: 'TP. Hồ Chí Minh',
  hotelStars: 5,
  transport: 'Máy bay + Xe đưa đón',
  styleTags: ['Biển đảo nghỉ dưỡng', 'Nghỉ dưỡng gia đình'],
  groupSizeTags: ['Cặp đôi', 'Gia đình', 'Nhóm bạn'],
  rating: 4.8,
  reviewCount: 356,
  bookingCount: 1240,
  route: phuQuocRoute,
  highlights: [
    'Cáp treo vượt biển Hòn Thơm dài nhất thế giới',
    'Tắm biển tại Bãi Sao — top bãi biển đẹp nhất châu Á',
    'Khám phá VinWonders & Safari bán hoang dã',
    'Thưởng thức hải sản tươi sống tại chợ đêm Dinh Cậu',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 7 ngày khởi hành. Hủy trong 3-7 ngày phí 30%. Hủy dưới 3 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 5* (3 đêm)',
    'Xe đưa đón sân bay & tham quan',
    'Vé cáp treo Hòn Thơm',
    'Vé VinWonders & Safari',
    'Hướng dẫn viên suốt tuyến',
    'Bảo hiểm du lịch',
    'Các bữa ăn theo chương trình',
  ],
  excludes: ['Chi phí cá nhân', 'Đồ uống ngoài chương trình', 'Tip hướng dẫn viên & lái xe'],
  itinerary: [
    {
      day: 1,
      title: 'TP.HCM — Phú Quốc — Nhận phòng nghỉ dưỡng',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Sunset Sanato Resort 5*',
      activities: [
        { time: '08:00', title: 'Khởi hành từ TP.HCM', description: 'Đón khách tại sân bay Tân Sơn Nhất, bay đến Phú Quốc.', location: phuQuocRoute[0] },
        { time: '10:30', title: 'Nhận phòng khách sạn', description: 'Nghỉ ngơi tại resort 5 sao view biển.', location: phuQuocRoute[1] },
        { time: '18:30', title: 'Chợ đêm Dinh Cậu', description: 'Thưởng thức hải sản tươi sống và dạo chợ đêm.', location: phuQuocRoute[5] },
      ],
    },
    {
      day: 2,
      title: 'Cáp treo Hòn Thơm — Bãi Sao',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Sunset Sanato Resort 5*',
      activities: [
        { time: '08:00', title: 'Cáp treo Hòn Thơm', description: 'Trải nghiệm cáp treo vượt biển dài nhất thế giới.', location: phuQuocRoute[2] },
        { time: '11:00', title: 'Công viên nước Aquatopia', description: 'Vui chơi tại công viên nước trên đảo Hòn Thơm.' },
        { time: '15:00', title: 'Tắm biển Bãi Sao', description: 'Thư giãn tại bãi biển cát trắng mịn nổi tiếng.', location: phuQuocRoute[3] },
      ],
    },
    {
      day: 3,
      title: 'VinWonders & Vinpearl Safari',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Sunset Sanato Resort 5*',
      activities: [
        { time: '08:30', title: 'VinWonders Phú Quốc', description: 'Khám phá công viên chủ đề lớn nhất Việt Nam.', location: phuQuocRoute[4] },
        { time: '14:00', title: 'Vinpearl Safari', description: 'Tham quan vườn thú bán hoang dã.' },
        { time: '19:00', title: 'Tự do khám phá', description: 'Tự do dạo phố hoặc thư giãn spa tại resort.' },
      ],
    },
    {
      day: 4,
      title: 'Tự do tắm biển — Về TP.HCM',
      meals: ['Sáng'],
      activities: [
        { time: '09:00', title: 'Tự do tắm biển tại resort', description: 'Tận hưởng buổi sáng cuối cùng bên bờ biển.' },
        { time: '13:00', title: 'Trả phòng, ra sân bay', description: 'Di chuyển ra sân bay, bay về TP.HCM.', location: phuQuocRoute[0] },
      ],
    },
  ],
  reviews: mkReviews([
    ['Minh Anh', 5, '2026-06-12', 'Resort đẹp, cáp treo view biển tuyệt vời. HDV rất nhiệt tình!'],
    ['Quốc Bảo', 5, '2026-05-28', 'Lịch trình hợp lý, đồ ăn ngon, đáng tiền.'],
    ['Thu Hà', 4, '2026-04-15', 'Mọi thứ tốt, chỉ hơi tiếc thời gian ở Bãi Sao hơi ngắn.'],
  ]),
};

// ---------------------------------------------------------------------------
// 2. Đà Nẵng - Hội An
// ---------------------------------------------------------------------------
const danangRoute: Coordinate[] = [
  { lat: 16.0439, lng: 108.1994, name: 'Sân bay Đà Nẵng', type: 'airport' },
  { lat: 16.0544, lng: 108.247, name: 'Khách sạn Mỹ Khê', type: 'hotel' },
  { lat: 15.9977, lng: 107.9857, name: 'Bà Nà Hills', type: 'attraction' },
  { lat: 16.061, lng: 108.2277, name: 'Cầu Rồng', type: 'attraction' },
  { lat: 15.8801, lng: 108.338, name: 'Phố cổ Hội An', type: 'attraction' },
  { lat: 16.1, lng: 108.263, name: 'Bán đảo Sơn Trà', type: 'stop' },
];

const danang: Tour = {
  id: 'danang-hoian',
  slug: 'da-nang-hoi-an-di-san-va-bien-xanh',
  name: 'Đà Nẵng — Hội An: Di Sản & Biển Xanh',
  destination: 'Đà Nẵng - Hội An',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('danang-cover'),
  gallery: [img('danang-1'), img('danang-2'), img('danang-3'), img('danang-4')],
  shortDescription: 'Cầu Vàng Bà Nà Hills, phố cổ Hội An lung linh đèn lồng và bãi biển Mỹ Khê quyến rũ.',
  description:
    'Hành trình kết hợp giữa thiên nhiên hùng vĩ của Bà Nà Hills, vẻ đẹp cổ kính của Hội An và bờ biển Mỹ Khê nổi tiếng thế giới. Phù hợp cho mọi lứa tuổi, đặc biệt là gia đình có trẻ nhỏ.',
  price: 5990000,
  discountPrice: 4790000,
  duration: 4,
  nights: 3,
  departure: 'Hà Nội',
  hotelStars: 4,
  transport: 'Máy bay + Xe đưa đón',
  styleTags: ['Văn hóa & Lịch sử', 'Nghỉ dưỡng gia đình', 'Ẩm thực đường phố'],
  groupSizeTags: ['Gia đình', 'Cặp đôi', 'Nhóm bạn'],
  rating: 4.9,
  reviewCount: 512,
  bookingCount: 2100,
  route: danangRoute,
  highlights: [
    'Check-in Cầu Vàng — bàn tay khổng lồ nổi tiếng thế giới',
    'Dạo phố đèn lồng Hội An về đêm',
    'Tắm biển Mỹ Khê — top biển đẹp nhất hành tinh',
    'Thưởng thức ẩm thực đường phố Đà Nẵng',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 5 ngày khởi hành. Hủy trong 2-5 ngày phí 30%. Hủy dưới 2 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* view biển (3 đêm)',
    'Vé cáp treo Bà Nà Hills',
    'Xe đưa đón trọn tuyến',
    'Hướng dẫn viên tiếng Việt',
    'Bảo hiểm du lịch',
    'Ăn sáng buffet + các bữa chính',
  ],
  excludes: ['Vé tham quan ngoài chương trình', 'Chi phí cá nhân', 'Đồ uống có cồn'],
  itinerary: [
    {
      day: 1,
      title: 'Hà Nội — Đà Nẵng — Biển Mỹ Khê',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Khách sạn Mỹ Khê 4*',
      activities: [
        { time: '07:30', title: 'Bay đến Đà Nẵng', description: 'Đón khách tại sân bay, di chuyển về khách sạn.', location: danangRoute[0] },
        { time: '15:00', title: 'Tắm biển Mỹ Khê', description: 'Thư giãn tại bãi biển được CNN vinh danh.', location: danangRoute[1] },
        { time: '20:00', title: 'Cầu Rồng phun lửa', description: 'Chiêm ngưỡng cầu Rồng phun lửa, phun nước cuối tuần.', location: danangRoute[3] },
      ],
    },
    {
      day: 2,
      title: 'Bà Nà Hills — Cầu Vàng',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn Mỹ Khê 4*',
      activities: [
        { time: '08:00', title: 'Cáp treo lên Bà Nà Hills', description: 'Chinh phục 1 trong những tuyến cáp treo dài nhất thế giới.', location: danangRoute[2] },
        { time: '10:00', title: 'Check-in Cầu Vàng', description: 'Tham quan biểu tượng Cầu Vàng nổi tiếng.' },
        { time: '14:00', title: 'Làng Pháp & Fantasy Park', description: 'Khám phá kiến trúc Pháp cổ và khu vui chơi trong nhà.' },
      ],
    },
    {
      day: 3,
      title: 'Phố cổ Hội An',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn Mỹ Khê 4*',
      activities: [
        { time: '08:30', title: 'Tham quan phố cổ Hội An', description: 'Chùa Cầu, nhà cổ Tấn Ký, hội quán Phúc Kiến.', location: danangRoute[4] },
        { time: '15:00', title: 'Trải nghiệm rối nước / thúng chai rừng dừa', description: 'Trải nghiệm văn hóa sông nước miền Trung.' },
        { time: '19:00', title: 'Phố đèn lồng về đêm', description: 'Thả hoa đăng trên sông Hoài, dạo phố đèn lồng.' },
      ],
    },
    {
      day: 4,
      title: 'Bán đảo Sơn Trà — Về Hà Nội',
      meals: ['Sáng'],
      activities: [
        { time: '08:00', title: 'Bán đảo Sơn Trà', description: 'Ngắm tượng Phật Quan Âm và toàn cảnh thành phố.', location: danangRoute[5] },
        { time: '13:00', title: 'Ra sân bay về Hà Nội', description: 'Kết thúc hành trình.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Hải Đăng', 5, '2026-07-02', 'Cầu Vàng đẹp như phim, HDV chụp ảnh cực có tâm.'],
    ['Lan Phương', 5, '2026-06-20', 'Hội An về đêm quá lãng mạn, đáng để trải nghiệm.'],
    ['Đức Trọng', 4, '2026-05-10', 'Chương trình dày dặn, hơi mệt nhưng đáng giá.'],
  ]),
};

// ---------------------------------------------------------------------------
// 3. Sa Pa
// ---------------------------------------------------------------------------
const sapaRoute: Coordinate[] = [
  { lat: 22.3364, lng: 103.8438, name: 'Trung tâm thị trấn Sa Pa', type: 'stop' },
  { lat: 22.335, lng: 103.84, name: 'Khách sạn Sapa Charm', type: 'hotel' },
  { lat: 22.3055, lng: 103.7745, name: 'Cáp treo Fansipan', type: 'attraction' },
  { lat: 22.326, lng: 103.829, name: 'Bản Cát Cát', type: 'attraction' },
  { lat: 22.31, lng: 103.86, name: 'Thung lũng Mường Hoa', type: 'attraction' },
];

const sapa: Tour = {
  id: 'sapa',
  slug: 'sa-pa-say-dam-may-troi',
  name: 'Sa Pa — Say Đắm Mây Trời',
  destination: 'Sa Pa',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('sapa-cover'),
  gallery: [img('sapa-1'), img('sapa-2'), img('sapa-3'), img('sapa-4')],
  shortDescription: 'Chinh phục Fansipan, hòa mình cùng bản sắc dân tộc Mông tại Cát Cát và ruộng bậc thang Mường Hoa.',
  description:
    'Sa Pa mang vẻ đẹp huyền ảo của núi rừng Tây Bắc với biển mây bồng bềnh, ruộng bậc thang kỳ vĩ và bản sắc văn hóa dân tộc đặc sắc. Chuyến đi lý tưởng cho những ai yêu thích khám phá và trekking nhẹ nhàng.',
  price: 3490000,
  discountPrice: 2790000,
  duration: 3,
  nights: 2,
  departure: 'Hà Nội',
  hotelStars: 4,
  transport: 'Xe giường nằm + Cáp treo',
  styleTags: ['Khám phá & Trekking', 'Văn hóa & Lịch sử'],
  groupSizeTags: ['Solo', 'Cặp đôi', 'Nhóm bạn'],
  rating: 4.7,
  reviewCount: 289,
  bookingCount: 980,
  route: sapaRoute,
  highlights: [
    'Chinh phục nóc nhà Đông Dương bằng cáp treo Fansipan',
    'Khám phá bản Cát Cát của người Mông',
    'Ngắm ruộng bậc thang thung lũng Mường Hoa',
    'Thưởng thức đặc sản cá hồi, thắng cố, rượu táo mèo',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 5 ngày khởi hành. Hủy trong 2-5 ngày phí 30%. Hủy dưới 2 ngày phí 100%.',
  includes: [
    'Xe giường nằm khứ hồi Hà Nội - Sa Pa',
    'Khách sạn 4* trung tâm thị trấn (2 đêm)',
    'Vé cáp treo Fansipan',
    'Hướng dẫn viên địa phương',
    'Bảo hiểm du lịch',
    'Các bữa ăn theo chương trình',
  ],
  excludes: ['Chi phí cá nhân', 'Đồ uống ngoài chương trình', 'Vé tàu hỏa leo núi Mường Hoa (tùy chọn)'],
  itinerary: [
    {
      day: 1,
      title: 'Hà Nội — Sa Pa — Bản Cát Cát',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Sapa Charm Hotel 4*',
      activities: [
        { time: '06:00', title: 'Khởi hành từ Hà Nội', description: 'Xe giường nằm cao cấp đưa đoàn lên Sa Pa.' },
        { time: '13:00', title: 'Nhận phòng nghỉ ngơi', description: 'Nhận phòng khách sạn view núi.', location: sapaRoute[1] },
        { time: '15:00', title: 'Khám phá bản Cát Cát', description: 'Tìm hiểu văn hóa dân tộc Mông, thác Cát Cát.', location: sapaRoute[3] },
      ],
    },
    {
      day: 2,
      title: 'Chinh phục Fansipan — Mường Hoa',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Sapa Charm Hotel 4*',
      activities: [
        { time: '08:00', title: 'Cáp treo Fansipan', description: 'Chinh phục nóc nhà Đông Dương cao 3.143m.', location: sapaRoute[2] },
        { time: '13:30', title: 'Thung lũng Mường Hoa', description: 'Ngắm ruộng bậc thang và bãi đá cổ.', location: sapaRoute[4] },
        { time: '19:00', title: 'Chợ đêm Sa Pa', description: 'Thưởng thức đặc sản vùng cao.', location: sapaRoute[0] },
      ],
    },
    {
      day: 3,
      title: 'Tự do khám phá — Về Hà Nội',
      meals: ['Sáng'],
      activities: [
        { time: '08:00', title: 'Tự do dạo thị trấn Sa Pa', description: 'Check-in Nhà thờ đá, quảng trường trung tâm.' },
        { time: '13:00', title: 'Khởi hành về Hà Nội', description: 'Kết thúc hành trình Sa Pa.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Thảo Vy', 5, '2026-03-18', 'Săn mây thành công, cảnh đẹp mê hồn!'],
    ['Trung Kiên', 4, '2026-02-25', 'Cáp treo hơi đông nhưng trải nghiệm đáng nhớ.'],
  ]),
};

// ---------------------------------------------------------------------------
// 4. Hà Giang Loop
// ---------------------------------------------------------------------------
const hagiangRoute: Coordinate[] = [
  { lat: 22.8256, lng: 104.9784, name: 'TP. Hà Giang', type: 'stop' },
  { lat: 23.13, lng: 105.08, name: 'Khách sạn Yên Minh', type: 'hotel' },
  { lat: 23.2733, lng: 105.355, name: 'Phố cổ Đồng Văn', type: 'attraction' },
  { lat: 23.3833, lng: 105.3167, name: 'Cột cờ Lũng Cú', type: 'attraction' },
  { lat: 23.2333, lng: 105.4167, name: 'Đèo Mã Pí Lèng', type: 'attraction' },
];

const hagiang: Tour = {
  id: 'ha-giang-loop',
  slug: 'ha-giang-loop-cung-duong-huyen-thoai',
  name: 'Hà Giang Loop — Cung Đường Huyền Thoại',
  destination: 'Hà Giang Loop',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('hagiang-cover'),
  gallery: [img('hagiang-1'), img('hagiang-2'), img('hagiang-3'), img('hagiang-4')],
  shortDescription: 'Chinh phục đèo Mã Pí Lèng, cột cờ Lũng Cú và cao nguyên đá Đồng Văn hùng vĩ.',
  description:
    'Hà Giang Loop là cung đường được mệnh danh đẹp nhất Việt Nam, đi qua cao nguyên đá Đồng Văn, đèo Mã Pí Lèng hiểm trở và cực Bắc Lũng Cú thiêng liêng. Trải nghiệm dành cho những tâm hồn ưa khám phá.',
  price: 4290000,
  discountPrice: 3590000,
  duration: 4,
  nights: 3,
  departure: 'Hà Nội',
  hotelStars: 3,
  transport: 'Xe khách + Xe máy/Ô tô địa phương',
  styleTags: ['Khám phá & Trekking', 'Văn hóa & Lịch sử'],
  groupSizeTags: ['Solo', 'Nhóm bạn'],
  rating: 4.9,
  reviewCount: 421,
  bookingCount: 1560,
  route: hagiangRoute,
  highlights: [
    'Chinh phục đèo Mã Pí Lèng — tứ đại đỉnh đèo Việt Nam',
    'Check-in cột cờ Lũng Cú — điểm cực Bắc Tổ quốc',
    'Khám phá phố cổ Đồng Văn về đêm',
    'Trải nghiệm văn hóa cao nguyên đá độc đáo',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 7 ngày khởi hành. Hủy trong 3-7 ngày phí 30%. Hủy dưới 3 ngày phí 100%.',
  includes: [
    'Xe khách khứ hồi Hà Nội - Hà Giang',
    'Khách sạn/homestay 3* (3 đêm)',
    'Xe/người lái xe máy theo cung đường',
    'Hướng dẫn viên bản địa',
    'Bảo hiểm du lịch',
    'Các bữa ăn theo chương trình',
  ],
  excludes: ['Chi phí cá nhân', 'Xăng xe máy tự túc', 'Đồ uống ngoài chương trình'],
  itinerary: [
    {
      day: 1,
      title: 'Hà Nội — TP. Hà Giang',
      meals: ['Tối'],
      accommodation: 'Khách sạn TP. Hà Giang 3*',
      activities: [
        { time: '21:00', title: 'Khởi hành từ Hà Nội', description: 'Xe giường nằm đêm đưa đoàn lên Hà Giang.' },
      ],
    },
    {
      day: 2,
      title: 'Hà Giang — Yên Minh — Đồng Văn',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Homestay Đồng Văn 3*',
      activities: [
        { time: '07:00', title: 'Xuất phát chinh phục cung đường', description: 'Di chuyển qua Quản Bạ, cổng trời, núi đôi Cô Tiên.', location: hagiangRoute[1] },
        { time: '14:00', title: 'Phố cổ Đồng Văn', description: 'Tham quan dinh thự họ Vương, phố cổ.', location: hagiangRoute[2] },
        { time: '19:00', title: 'Chợ đêm Đồng Văn', description: 'Thưởng thức ẩm thực vùng cao nguyên đá.' },
      ],
    },
    {
      day: 3,
      title: 'Lũng Cú — Mã Pí Lèng',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Homestay Mèo Vạc 3*',
      activities: [
        { time: '07:30', title: 'Cột cờ Lũng Cú', description: 'Check-in điểm cực Bắc thiêng liêng của Tổ quốc.', location: hagiangRoute[3] },
        { time: '13:00', title: 'Đèo Mã Pí Lèng', description: 'Chinh phục cung đường đèo hiểm trở bậc nhất.', location: hagiangRoute[4] },
        { time: '15:30', title: 'Thuyền trên sông Nho Quế', description: 'Ngắm hẻm vực Tu Sản kỳ vĩ.' },
      ],
    },
    {
      day: 4,
      title: 'Hà Giang — Hà Nội',
      meals: ['Sáng'],
      activities: [
        { time: '08:00', title: 'Trở về TP. Hà Giang', description: 'Di chuyển về trung tâm thành phố.', location: hagiangRoute[0] },
        { time: '13:00', title: 'Khởi hành về Hà Nội', description: 'Kết thúc hành trình Hà Giang Loop.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Anh Tuấn', 5, '2026-04-08', 'Cung đường đẹp nao lòng, xứng đáng trải nghiệm 1 lần trong đời.'],
    ['Ngọc Diệp', 5, '2026-03-22', 'HDV lái xe cực kỳ chuyên nghiệp, an toàn tuyệt đối.'],
    ['Bảo Long', 4, '2026-02-14', 'Hơi mệt vì di chuyển nhiều nhưng cảnh đẹp bù đắp tất cả.'],
  ]),
};

// ---------------------------------------------------------------------------
// 5. Nha Trang
// ---------------------------------------------------------------------------
const nhatrangRoute: Coordinate[] = [
  { lat: 11.9982, lng: 109.2194, name: 'Sân bay Cam Ranh', type: 'airport' },
  { lat: 12.238, lng: 109.196, name: 'Khách sạn trung tâm Nha Trang', type: 'hotel' },
  { lat: 12.217, lng: 109.238, name: 'VinWonders Nha Trang', type: 'attraction' },
  { lat: 12.265, lng: 109.196, name: 'Tháp Bà Ponagar', type: 'attraction' },
  { lat: 12.33, lng: 109.22, name: 'Suối khoáng nóng Tháp Bà', type: 'attraction' },
];

const nhatrang: Tour = {
  id: 'nha-trang',
  slug: 'nha-trang-vien-ngoc-bien-dong',
  name: 'Nha Trang — Viên Ngọc Biển Đông',
  destination: 'Nha Trang',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('nhatrang-cover'),
  gallery: [img('nhatrang-1'), img('nhatrang-2'), img('nhatrang-3'), img('nhatrang-4')],
  shortDescription: 'Lặn ngắm san hô, vui chơi tại VinWonders và tắm bùn khoáng nóng thư giãn.',
  description:
    'Nha Trang nổi tiếng với vịnh biển xanh ngọc bích, các hòn đảo hoang sơ và dịch vụ du lịch phát triển bậc nhất miền Trung. Đây là điểm đến lý tưởng cho gia đình và nhóm bạn yêu biển.',
  price: 4990000,
  discountPrice: 3990000,
  duration: 3,
  nights: 2,
  departure: 'TP. Hồ Chí Minh',
  hotelStars: 4,
  transport: 'Máy bay + Ca nô',
  styleTags: ['Biển đảo nghỉ dưỡng', 'Nghỉ dưỡng gia đình'],
  groupSizeTags: ['Gia đình', 'Cặp đôi', 'Nhóm bạn'],
  rating: 4.6,
  reviewCount: 378,
  bookingCount: 1430,
  route: nhatrangRoute,
  highlights: [
    'Vui chơi tại VinWonders trên đảo Hòn Tre',
    'Lặn ngắm san hô tại vịnh Nha Trang',
    'Tắm bùn khoáng nóng Tháp Bà',
    'Tham quan di tích Tháp Bà Ponagar',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 5 ngày khởi hành. Hủy trong 2-5 ngày phí 30%. Hủy dưới 2 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* trung tâm (2 đêm)',
    'Vé VinWonders + cáp treo vượt biển',
    'Tour 4 đảo bằng ca nô',
    'Hướng dẫn viên suốt tuyến',
    'Bảo hiểm du lịch',
  ],
  excludes: ['Vé tắm bùn khoáng (tùy chọn)', 'Chi phí cá nhân', 'Đồ uống ngoài chương trình'],
  itinerary: [
    {
      day: 1,
      title: 'TP.HCM — Nha Trang — VinWonders',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Khách sạn trung tâm 4*',
      activities: [
        { time: '07:00', title: 'Bay đến Cam Ranh', description: 'Di chuyển về trung tâm thành phố.', location: nhatrangRoute[0] },
        { time: '13:00', title: 'VinWonders Nha Trang', description: 'Vui chơi tại công viên giải trí trên đảo Hòn Tre.', location: nhatrangRoute[2] },
        { time: '19:00', title: 'Dạo phố biển Trần Phú', description: 'Thư giãn buổi tối bên bờ biển.' },
      ],
    },
    {
      day: 2,
      title: 'Tour 4 đảo — Lặn ngắm san hô',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn trung tâm 4*',
      activities: [
        { time: '08:00', title: 'Ca nô tham quan 4 đảo', description: 'Hòn Mun, Hòn Tằm, Hòn Một, Bãi Tranh.' },
        { time: '10:30', title: 'Lặn ngắm san hô', description: 'Trải nghiệm lặn biển tại vịnh Nha Trang.' },
        { time: '19:00', title: 'Tự do khám phá ẩm thực', description: 'Thưởng thức hải sản địa phương.' },
      ],
    },
    {
      day: 3,
      title: 'Tháp Bà Ponagar — Suối khoáng nóng',
      meals: ['Sáng'],
      activities: [
        { time: '08:00', title: 'Tháp Bà Ponagar', description: 'Tham quan quần thể di tích Chăm Pa cổ.', location: nhatrangRoute[3] },
        { time: '10:00', title: 'Tắm bùn khoáng nóng', description: 'Thư giãn tại suối khoáng nóng Tháp Bà.', location: nhatrangRoute[4] },
        { time: '13:30', title: 'Ra sân bay về TP.HCM', description: 'Kết thúc hành trình.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Kim Ngân', 5, '2026-06-01', 'Biển đẹp, VinWonders rất đáng chơi cả ngày.'],
    ['Việt Hoàng', 4, '2026-05-15', 'Tour 4 đảo vui, chỉ tiếc thời tiết hôm đó hơi sóng.'],
  ]),
};

// ---------------------------------------------------------------------------
// 6. Đà Lạt
// ---------------------------------------------------------------------------
const dalatRoute: Coordinate[] = [
  { lat: 11.75, lng: 108.3667, name: 'Sân bay Liên Khương', type: 'airport' },
  { lat: 11.9404, lng: 108.4383, name: 'Khách sạn Hồ Xuân Hương', type: 'hotel' },
  { lat: 11.8967, lng: 108.4453, name: 'Thác Datanla', type: 'attraction' },
  { lat: 12.05, lng: 108.4333, name: 'Núi Langbiang', type: 'attraction' },
  { lat: 11.945, lng: 108.457, name: 'Vườn hoa thành phố', type: 'attraction' },
];

const dalat: Tour = {
  id: 'da-lat',
  slug: 'da-lat-thanh-pho-ngan-hoa',
  name: 'Đà Lạt — Thành Phố Ngàn Hoa',
  destination: 'Đà Lạt',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('dalat-cover'),
  gallery: [img('dalat-1'), img('dalat-2'), img('dalat-3'), img('dalat-4')],
  shortDescription: 'Se lạnh cao nguyên, vườn hoa rực rỡ, thác Datanla và đỉnh Langbiang huyền thoại.',
  description:
    'Đà Lạt quyến rũ du khách bởi khí hậu mát mẻ quanh năm, những đồi thông xanh ngát và vô số điểm check-in lãng mạn. Hành trình dành cho các cặp đôi và gia đình muốn tìm không gian yên bình.',
  price: 2990000,
  discountPrice: 2390000,
  duration: 3,
  nights: 2,
  departure: 'TP. Hồ Chí Minh',
  hotelStars: 4,
  transport: 'Xe giường nằm',
  styleTags: ['Nghỉ dưỡng gia đình', 'Khám phá & Trekking'],
  groupSizeTags: ['Cặp đôi', 'Gia đình', 'Solo'],
  rating: 4.7,
  reviewCount: 445,
  bookingCount: 1780,
  route: dalatRoute,
  highlights: [
    'Chinh phục đỉnh Langbiang huyền thoại',
    'Check-in thác Datanla với máng trượt',
    'Dạo quanh vườn hoa thành phố rực rỡ sắc màu',
    'Thưởng thức đặc sản lẩu gà lá é, bánh tráng nướng',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 5 ngày khởi hành. Hủy trong 2-5 ngày phí 30%. Hủy dưới 2 ngày phí 100%.',
  includes: [
    'Xe giường nằm khứ hồi',
    'Khách sạn 4* trung tâm (2 đêm)',
    'Vé tham quan Datanla, Langbiang',
    'Hướng dẫn viên suốt tuyến',
    'Bảo hiểm du lịch',
    'Các bữa ăn theo chương trình',
  ],
  excludes: ['Chi phí cá nhân', 'Xe jeep lên Langbiang (tùy chọn)', 'Đồ uống ngoài chương trình'],
  itinerary: [
    {
      day: 1,
      title: 'TP.HCM — Đà Lạt — Vườn hoa thành phố',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Khách sạn Hồ Xuân Hương 4*',
      activities: [
        { time: '06:00', title: 'Khởi hành từ TP.HCM', description: 'Xe giường nằm đưa đoàn lên Đà Lạt.' },
        { time: '13:00', title: 'Nhận phòng nghỉ ngơi', description: 'Nhận phòng khách sạn trung tâm.', location: dalatRoute[1] },
        { time: '16:00', title: 'Vườn hoa thành phố', description: 'Dạo chơi, chụp ảnh giữa muôn sắc hoa.', location: dalatRoute[4] },
      ],
    },
    {
      day: 2,
      title: 'Thác Datanla — Langbiang',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn Hồ Xuân Hương 4*',
      activities: [
        { time: '08:00', title: 'Thác Datanla', description: 'Trải nghiệm máng trượt và cảnh thác hùng vĩ.', location: dalatRoute[2] },
        { time: '13:30', title: 'Núi Langbiang', description: 'Xe jeep chinh phục đỉnh núi huyền thoại.', location: dalatRoute[3] },
        { time: '19:00', title: 'Chợ đêm Đà Lạt', description: 'Thưởng thức đặc sản đêm se lạnh.' },
      ],
    },
    {
      day: 3,
      title: 'Tự do khám phá — Về TP.HCM',
      meals: ['Sáng'],
      activities: [
        { time: '08:00', title: 'Tự do tham quan đồi chè Cầu Đất / Cafe view đẹp', description: 'Khám phá theo sở thích cá nhân.' },
        { time: '13:00', title: 'Khởi hành về TP.HCM', description: 'Kết thúc hành trình Đà Lạt.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Mai Chi', 5, '2026-01-20', 'Đà Lạt lúc nào cũng lãng mạn, lịch trình rất hợp lý.'],
    ['Tấn Phát', 4, '2026-02-02', 'Đồ ăn ngon, khách sạn sạch đẹp, sẽ quay lại.'],
  ]),
};

// ---------------------------------------------------------------------------
// 7. Quy Nhơn
// ---------------------------------------------------------------------------
const quynhonRoute: Coordinate[] = [
  { lat: 13.955, lng: 109.042, name: 'Sân bay Phù Cát', type: 'airport' },
  { lat: 13.782, lng: 109.219, name: 'Khách sạn trung tâm Quy Nhơn', type: 'hotel' },
  { lat: 13.8833, lng: 109.3167, name: 'Kỳ Co', type: 'attraction' },
  { lat: 13.889, lng: 109.299, name: 'Eo Gió', type: 'attraction' },
  { lat: 13.78, lng: 109.24, name: 'Đầm Thị Nại', type: 'stop' },
];

const quynhon: Tour = {
  id: 'quy-nhon',
  slug: 'quy-nhon-vien-ngoc-tho',
  name: 'Quy Nhơn — Viên Ngọc Thô',
  destination: 'Quy Nhơn',
  country: 'Việt Nam',
  region: 'Việt Nam',
  coverImage: img('quynhon-cover'),
  gallery: [img('quynhon-1'), img('quynhon-2'), img('quynhon-3'), img('quynhon-4')],
  shortDescription: 'Kỳ Co hoang sơ, Eo Gió lãng mạn — thiên đường biển chưa bị thương mại hóa.',
  description:
    'Quy Nhơn vẫn giữ được nét hoang sơ, bình yên hiếm có. Kỳ Co được ví như "Maldives của Việt Nam" trong khi Eo Gió mang vẻ đẹp hùng vĩ của núi non ôm trọn biển xanh.',
  price: 4590000,
  discountPrice: 3690000,
  duration: 4,
  nights: 3,
  departure: 'Hà Nội',
  hotelStars: 4,
  transport: 'Máy bay + Ca nô',
  styleTags: ['Biển đảo nghỉ dưỡng', 'Ẩm thực đường phố'],
  groupSizeTags: ['Cặp đôi', 'Nhóm bạn', 'Gia đình'],
  rating: 4.8,
  reviewCount: 267,
  bookingCount: 890,
  route: quynhonRoute,
  highlights: [
    'Tắm biển Kỳ Co — "Maldives của Việt Nam"',
    'Check-in Eo Gió lúc bình minh',
    'Thưởng thức bánh xèo tôm nhảy, nem chợ huyện',
    'Khám phá tháp Chăm Đôi cổ kính',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 7 ngày khởi hành. Hủy trong 3-7 ngày phí 30%. Hủy dưới 3 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* trung tâm (3 đêm)',
    'Ca nô tham quan Kỳ Co - Eo Gió',
    'Hướng dẫn viên suốt tuyến',
    'Bảo hiểm du lịch',
    'Các bữa ăn theo chương trình',
  ],
  excludes: ['Chi phí cá nhân', 'Dù lượn (tùy chọn)', 'Đồ uống ngoài chương trình'],
  itinerary: [
    {
      day: 1,
      title: 'Hà Nội — Quy Nhơn',
      meals: ['Trưa', 'Tối'],
      accommodation: 'Khách sạn trung tâm 4*',
      activities: [
        { time: '07:00', title: 'Bay đến Phù Cát', description: 'Di chuyển về trung tâm Quy Nhơn.', location: quynhonRoute[0] },
        { time: '15:00', title: 'Dạo biển Quy Nhơn', description: 'Thư giãn dọc bờ biển thành phố.', location: quynhonRoute[1] },
      ],
    },
    {
      day: 2,
      title: 'Kỳ Co — Eo Gió',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn trung tâm 4*',
      activities: [
        { time: '07:30', title: 'Ca nô ra Kỳ Co', description: 'Tắm biển tại vịnh biển đẹp như Maldives.', location: quynhonRoute[2] },
        { time: '13:30', title: 'Eo Gió', description: 'Ngắm cảnh núi non hùng vĩ ôm biển xanh.', location: quynhonRoute[3] },
      ],
    },
    {
      day: 3,
      title: 'Tháp Chăm Đôi — Đầm Thị Nại',
      meals: ['Sáng', 'Trưa', 'Tối'],
      accommodation: 'Khách sạn trung tâm 4*',
      activities: [
        { time: '08:00', title: 'Tháp Chăm Đôi', description: 'Tham quan di tích kiến trúc Chăm Pa.' },
        { time: '15:00', title: 'Cầu vượt biển Thị Nại', description: 'Ngắm hoàng hôn trên đầm phá lớn nhất Đông Nam Á.', location: quynhonRoute[4] },
      ],
    },
    {
      day: 4,
      title: 'Tự do — Về Hà Nội',
      meals: ['Sáng'],
      activities: [
        { time: '09:00', title: 'Tự do khám phá thành phố', description: 'Mua sắm đặc sản, cafe view biển.' },
        { time: '14:00', title: 'Ra sân bay về Hà Nội', description: 'Kết thúc hành trình Quy Nhơn.' },
      ],
    },
  ],
  reviews: mkReviews([
    ['Hoài Thương', 5, '2026-05-05', 'Kỳ Co đẹp xuất sắc, nước biển trong vắt nhìn thấy đáy.'],
    ['Đình Phong', 5, '2026-04-11', 'Chưa đông khách du lịch nên còn giữ được nét hoang sơ.'],
  ]),
};

// ---------------------------------------------------------------------------
// 8. Tokyo
// ---------------------------------------------------------------------------
const tokyoRoute: Coordinate[] = [
  { lat: 35.772, lng: 140.3929, name: 'Sân bay Narita', type: 'airport' },
  { lat: 35.6895, lng: 139.6917, name: 'Khách sạn trung tâm Shinjuku', type: 'hotel' },
  { lat: 35.7148, lng: 139.7967, name: 'Chùa Sensō-ji', type: 'attraction' },
  { lat: 35.6595, lng: 139.7005, name: 'Giao lộ Shibuya', type: 'attraction' },
  { lat: 35.6586, lng: 139.7454, name: 'Tháp Tokyo', type: 'attraction' },
  { lat: 35.5, lng: 138.7667, name: 'Núi Phú Sĩ - Kawaguchiko', type: 'stop' },
];

const tokyo: Tour = {
  id: 'tokyo',
  slug: 'tokyo-hoi-tu-truyen-thong-hien-dai',
  name: 'Tokyo — Hội Tụ Truyền Thống & Hiện Đại',
  destination: 'Tokyo',
  country: 'Nhật Bản',
  region: 'Quốc tế',
  coverImage: img('tokyo-cover'),
  gallery: [img('tokyo-1'), img('tokyo-2'), img('tokyo-3'), img('tokyo-4')],
  shortDescription: 'Núi Phú Sĩ hùng vĩ, chùa cổ Asakusa và nhịp sống sôi động Shibuya, Shinjuku.',
  description:
    'Tokyo là sự giao thoa hoàn hảo giữa nét truyền thống Nhật Bản và công nghệ hiện đại bậc nhất thế giới. Hành trình đưa bạn từ núi Phú Sĩ hùng vĩ đến những khu phố sầm uất nhất thủ đô.',
  price: 24990000,
  discountPrice: 21990000,
  duration: 6,
  nights: 5,
  departure: 'TP. Hồ Chí Minh',
  hotelStars: 4,
  transport: 'Máy bay + Tàu điện + Xe du lịch',
  styleTags: ['Văn hóa & Lịch sử', 'Ẩm thực đường phố', 'Khám phá & Trekking'],
  groupSizeTags: ['Cặp đôi', 'Gia đình', 'Nhóm bạn'],
  rating: 4.9,
  reviewCount: 198,
  bookingCount: 540,
  route: tokyoRoute,
  highlights: [
    'Ngắm núi Phú Sĩ tại hồ Kawaguchiko',
    'Tham quan chùa cổ Sensō-ji tại Asakusa',
    'Check-in giao lộ Shibuya sầm uất nhất thế giới',
    'Chiêm ngưỡng toàn cảnh Tokyo từ tháp Tokyo',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 14 ngày khởi hành. Hủy trong 7-14 ngày phí 30%. Hủy dưới 7 ngày phí 100% (áp dụng chính sách visa/vé máy bay quốc tế).',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* (5 đêm)',
    'Vé tàu Shinkansen/tàu điện nội đô',
    'Hướng dẫn viên tiếng Việt suốt tuyến',
    'Bảo hiểm du lịch quốc tế',
    'Hỗ trợ visa Nhật Bản',
    'Ăn sáng + các bữa chính theo chương trình',
  ],
  excludes: ['Lệ phí visa (nếu có)', 'Chi phí cá nhân', 'Đồ uống ngoài chương trình', 'Tip HDV địa phương'],
  itinerary: [
    { day: 1, title: 'TP.HCM — Tokyo (Narita)', meals: ['Tối'], accommodation: 'Khách sạn Shinjuku 4*', activities: [{ time: '09:00', title: 'Khởi hành đến Narita', description: 'Bay thẳng đến Tokyo, làm thủ tục nhập cảnh.', location: tokyoRoute[0] }, { time: '18:00', title: 'Nhận phòng, dạo phố Shinjuku', description: 'Khám phá khu phố sầm uất về đêm.', location: tokyoRoute[1] }] },
    { day: 2, title: 'Asakusa — Shibuya', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Shinjuku 4*', activities: [{ time: '08:30', title: 'Chùa Sensō-ji', description: 'Tham quan ngôi chùa cổ nhất Tokyo, phố Nakamise.', location: tokyoRoute[2] }, { time: '14:00', title: 'Giao lộ Shibuya', description: 'Check-in giao lộ đông đúc nhất thế giới, tượng chú chó Hachiko.', location: tokyoRoute[3] }] },
    { day: 3, title: 'Núi Phú Sĩ — Kawaguchiko', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Ryokan Kawaguchiko 4*', activities: [{ time: '08:00', title: 'Di chuyển đến hồ Kawaguchiko', description: 'Ngắm toàn cảnh núi Phú Sĩ soi bóng xuống hồ.', location: tokyoRoute[5] }, { time: '15:00', title: 'Trải nghiệm onsen truyền thống', description: 'Thư giãn tại suối nước nóng Nhật Bản.' }] },
    { day: 4, title: 'Tháp Tokyo — Odaiba', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Shinjuku 4*', activities: [{ time: '09:00', title: 'Tháp Tokyo', description: 'Ngắm toàn cảnh thành phố từ đài quan sát.', location: tokyoRoute[4] }, { time: '14:00', title: 'Đảo nhân tạo Odaiba', description: 'Tham quan tượng Gundam, mua sắm tại DiverCity.' }] },
    { day: 5, title: 'Mua sắm Ginza — Akihabara', meals: ['Sáng', 'Trưa'], accommodation: 'Khách sạn Shinjuku 4*', activities: [{ time: '09:30', title: 'Phố Ginza', description: 'Mua sắm tại khu phố sang trọng bậc nhất Tokyo.' }, { time: '14:00', title: 'Akihabara', description: 'Khám phá thiên đường anime, điện tử.' }] },
    { day: 6, title: 'Tokyo — TP.HCM', meals: ['Sáng'], activities: [{ time: '10:00', title: 'Ra sân bay Narita', description: 'Kết thúc hành trình, bay về TP.HCM.', location: tokyoRoute[0] }] },
  ],
  reviews: mkReviews([
    ['Phương Thảo', 5, '2026-04-02', 'Chuyến đi trong mơ, núi Phú Sĩ đẹp không tì vết!'],
    ['Gia Huy', 5, '2026-03-11', 'Dịch vụ chuyên nghiệp, HDV am hiểu văn hóa Nhật.'],
    ['Ánh Tuyết', 4, '2026-01-29', 'Lịch trình dày nhưng đầy đủ trải nghiệm đáng giá.'],
  ]),
};

// ---------------------------------------------------------------------------
// 9. Seoul
// ---------------------------------------------------------------------------
const seoulRoute: Coordinate[] = [
  { lat: 37.4602, lng: 126.4407, name: 'Sân bay Incheon', type: 'airport' },
  { lat: 37.5636, lng: 126.985, name: 'Khách sạn Myeongdong', type: 'hotel' },
  { lat: 37.5796, lng: 126.977, name: 'Cung Gyeongbokgung', type: 'attraction' },
  { lat: 37.5512, lng: 126.9882, name: 'Tháp N Seoul', type: 'attraction' },
  { lat: 37.2939, lng: 127.2027, name: 'Everland', type: 'attraction' },
];

const seoul: Tour = {
  id: 'seoul',
  slug: 'seoul-lang-man-bon-mua',
  name: 'Seoul — Lãng Mạn Bốn Mùa',
  destination: 'Seoul',
  country: 'Hàn Quốc',
  region: 'Quốc tế',
  coverImage: img('seoul-cover'),
  gallery: [img('seoul-1'), img('seoul-2'), img('seoul-3'), img('seoul-4')],
  shortDescription: 'Cung điện cổ kính Gyeongbokgung, công viên giải trí Everland và phố mua sắm Myeongdong.',
  description:
    'Seoul là điểm đến hoàn hảo cho tín đồ mua sắm, ẩm thực và những ai yêu thích văn hóa Hàn Quốc. Từ cung điện hoàng gia cổ kính đến công viên giải trí hiện đại, Seoul mang đến trải nghiệm trọn vẹn.',
  price: 18990000,
  discountPrice: 15990000,
  duration: 5,
  nights: 4,
  departure: 'Hà Nội',
  hotelStars: 4,
  transport: 'Máy bay + Xe du lịch',
  styleTags: ['Văn hóa & Lịch sử', 'Ẩm thực đường phố', 'Nghỉ dưỡng gia đình'],
  groupSizeTags: ['Cặp đôi', 'Gia đình', 'Nhóm bạn'],
  rating: 4.8,
  reviewCount: 234,
  bookingCount: 670,
  route: seoulRoute,
  highlights: [
    'Diện Hanbok tham quan cung Gyeongbokgung',
    'Vui chơi thả ga tại Everland',
    'Ngắm hoàng hôn từ tháp N Seoul',
    'Mua sắm thả ga tại Myeongdong, Hongdae',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 14 ngày khởi hành. Hủy trong 7-14 ngày phí 30%. Hủy dưới 7 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* (4 đêm)',
    'Vé Everland trọn gói',
    'Trải nghiệm thuê Hanbok',
    'Hướng dẫn viên tiếng Việt',
    'Bảo hiểm du lịch quốc tế',
    'Ăn sáng + các bữa chính',
  ],
  excludes: ['Lệ phí visa (nếu có)', 'Chi phí cá nhân', 'Đồ uống ngoài chương trình'],
  itinerary: [
    { day: 1, title: 'Hà Nội — Seoul', meals: ['Tối'], accommodation: 'Khách sạn Myeongdong 4*', activities: [{ time: '08:00', title: 'Bay đến Incheon', description: 'Làm thủ tục nhập cảnh, di chuyển về khách sạn.', location: seoulRoute[0] }] },
    { day: 2, title: 'Cung Gyeongbokgung — Bukchon Hanok', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Myeongdong 4*', activities: [{ time: '09:00', title: 'Diện Hanbok tham quan cung điện', description: 'Trải nghiệm trang phục truyền thống Hàn Quốc.', location: seoulRoute[2] }, { time: '14:00', title: 'Làng cổ Bukchon Hanok', description: 'Dạo bước giữa những ngôi nhà truyền thống.' }] },
    { day: 3, title: 'Everland cả ngày', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Myeongdong 4*', activities: [{ time: '09:00', title: 'Công viên Everland', description: 'Vui chơi thỏa thích tại công viên giải trí lớn nhất Hàn Quốc.', location: seoulRoute[4] }] },
    { day: 4, title: 'Tháp N Seoul — Myeongdong', meals: ['Sáng', 'Trưa'], accommodation: 'Khách sạn Myeongdong 4*', activities: [{ time: '10:00', title: 'Tháp N Seoul', description: 'Ngắm toàn cảnh thành phố, khóa tình yêu.', location: seoulRoute[3] }, { time: '15:00', title: 'Mua sắm Myeongdong', description: 'Thiên đường mỹ phẩm và thời trang Hàn Quốc.', location: seoulRoute[1] }] },
    { day: 5, title: 'Seoul — Hà Nội', meals: ['Sáng'], activities: [{ time: '11:00', title: 'Ra sân bay Incheon', description: 'Kết thúc hành trình, bay về Hà Nội.', location: seoulRoute[0] }] },
  ],
  reviews: mkReviews([
    ['Linh Chi', 5, '2026-02-18', 'Everland siêu vui, mặc Hanbok chụp ảnh cực đẹp.'],
    ['Nam Khánh', 4, '2026-01-05', 'Lịch trình ổn, mong có thêm thời gian tự do mua sắm.'],
  ]),
};

// ---------------------------------------------------------------------------
// 10. Singapore
// ---------------------------------------------------------------------------
const singaporeRoute: Coordinate[] = [
  { lat: 1.3644, lng: 103.9915, name: 'Sân bay Changi', type: 'airport' },
  { lat: 1.2966, lng: 103.8558, name: 'Khách sạn trung tâm Bugis', type: 'hotel' },
  { lat: 1.2834, lng: 103.8607, name: 'Marina Bay Sands', type: 'attraction' },
  { lat: 1.2816, lng: 103.8636, name: 'Gardens by the Bay', type: 'attraction' },
  { lat: 1.2540, lng: 103.8238, name: 'Sentosa & Universal Studios', type: 'attraction' },
];

const singapore: Tour = {
  id: 'singapore',
  slug: 'singapore-dao-quoc-su-tu-hien-dai',
  name: 'Singapore — Đảo Quốc Sư Tử Hiện Đại',
  destination: 'Singapore',
  country: 'Singapore',
  region: 'Quốc tế',
  coverImage: img('singapore-cover'),
  gallery: [img('singapore-1'), img('singapore-2'), img('singapore-3'), img('singapore-4')],
  shortDescription: 'Marina Bay Sands lộng lẫy, Gardens by the Bay huyền ảo và đảo Sentosa sôi động.',
  description:
    'Singapore là điểm đến hoàn hảo cho kỳ nghỉ ngắn ngày với kiến trúc hiện đại bậc nhất thế giới, công viên siêu thực Gardens by the Bay và đảo giải trí Sentosa dành cho mọi lứa tuổi.',
  price: 13990000,
  discountPrice: 11490000,
  duration: 4,
  nights: 3,
  departure: 'TP. Hồ Chí Minh',
  hotelStars: 4,
  transport: 'Máy bay + MRT + Xe du lịch',
  styleTags: ['Nghỉ dưỡng gia đình', 'Khám phá & Trekking', 'Ẩm thực đường phố'],
  groupSizeTags: ['Cặp đôi', 'Gia đình', 'Nhóm bạn'],
  rating: 4.9,
  reviewCount: 312,
  bookingCount: 950,
  route: singaporeRoute,
  highlights: [
    'Chiêm ngưỡng show nhạc nước Marina Bay Sands',
    'Khám phá siêu cây Gardens by the Bay về đêm',
    'Vui chơi trọn ngày tại Universal Studios Sentosa',
    'Thưởng thức ẩm thực đường phố tại Chinatown, Little India',
  ],
  cancellationPolicy: 'Miễn phí hủy trước 10 ngày khởi hành. Hủy trong 5-10 ngày phí 30%. Hủy dưới 5 ngày phí 100%.',
  includes: [
    'Vé máy bay khứ hồi',
    'Khách sạn 4* trung tâm (3 đêm)',
    'Vé Universal Studios Singapore',
    'Vé Gardens by the Bay (2 vòm)',
    'Hướng dẫn viên tiếng Việt',
    'Bảo hiểm du lịch quốc tế',
  ],
  excludes: ['Chi phí cá nhân', 'Vé lên đài Marina Bay Sands Skypark (tùy chọn)', 'Đồ uống ngoài chương trình'],
  itinerary: [
    { day: 1, title: 'TP.HCM — Singapore', meals: ['Tối'], accommodation: 'Khách sạn Bugis 4*', activities: [{ time: '09:00', title: 'Bay đến Changi', description: 'Nhập cảnh, về khách sạn nhận phòng.', location: singaporeRoute[0] }, { time: '19:30', title: 'Show nhạc nước Marina Bay', description: 'Chiêm ngưỡng show Spectra miễn phí.', location: singaporeRoute[2] }] },
    { day: 2, title: 'Universal Studios Sentosa', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Bugis 4*', activities: [{ time: '09:00', title: 'Đảo Sentosa', description: 'Vui chơi cả ngày tại Universal Studios.', location: singaporeRoute[4] }] },
    { day: 3, title: 'Gardens by the Bay — Chinatown', meals: ['Sáng', 'Trưa', 'Tối'], accommodation: 'Khách sạn Bugis 4*', activities: [{ time: '09:30', title: 'Gardens by the Bay', description: 'Khám phá Cloud Forest, Flower Dome và Supertree Grove.', location: singaporeRoute[3] }, { time: '15:00', title: 'Chinatown & Little India', description: 'Trải nghiệm ẩm thực đường phố đa văn hóa.' }] },
    { day: 4, title: 'Singapore — TP.HCM', meals: ['Sáng'], activities: [{ time: '11:00', title: 'Ra sân bay Changi', description: 'Kết thúc hành trình, bay về TP.HCM.', location: singaporeRoute[0] }] },
  ],
  reviews: mkReviews([
    ['Bích Ngọc', 5, '2026-03-30', 'Gardens by the Bay về đêm đẹp lung linh, đáng đồng tiền bát gạo.'],
    ['Hữu Nghĩa', 5, '2026-02-08', 'Universal Studios quá đã, gia đình mình chơi không muốn về.'],
    ['Cẩm Tú', 4, '2026-01-15', 'Lịch trình khá dày, nên dành thêm 1 ngày tự do.'],
  ]),
};

export const TOURS: Tour[] = [
  phuQuoc,
  danang,
  sapa,
  hagiang,
  nhatrang,
  dalat,
  quynhon,
  tokyo,
  seoul,
  singapore,
];

export const getTourById = (id: string): Tour | undefined => TOURS.find((t) => t.id === id);
