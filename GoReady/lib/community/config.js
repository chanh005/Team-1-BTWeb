export const COMMUNITY_CONFIG = {
  // Nhãn hiển thị menu & navigation
  MENU_LABEL: 'Cộng đồng',
  MENU_MOBILE_LABEL: 'Cộng đồng',
  MENU_VALUE: 'community',
  MENU_ROUTE: '/cong-dong',
  PAGE_TITLE: 'Cộng đồng du lịch GoReady',
  PAGE_SUBTITLE: 'Chia sẻ kinh nghiệm thực tế, review tour đã đi và kết nối cùng những người đam mê xê dịch.',

  // Danh sách các nhóm bài viết
  GROUPS: [
    {
      id: 'family',
      name: 'Nghỉ dưỡng gia đình',
      description: 'Lịch trình thong thả, thân thiện với trẻ nhỏ và người lớn tuổi',
      icon: '👨‍👩‍👧‍👦',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'backpack',
      name: 'Phượt & Khám phá',
      description: 'Trekking, cắm trại, chinh phục các cung đường và địa danh mới lạ',
      icon: '🎒',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'deal',
      name: 'Săn Deal & Tiết kiệm',
      description: 'Mẹo săn vé rẻ, combo ưu đãi, kinh nghiệm chi tiêu du lịch tối ưu',
      icon: '🏷️',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'student',
      name: 'Sinh viên & Giới trẻ',
      description: 'Tọa độ check-in sống ảo, du lịch nhóm bạn, chi phí hạt dẻ',
      icon: '🎓',
      color: 'bg-sky-50 text-sky-700 border-sky-200',
    },
  ],

  // Danh sách các điểm đến phổ biến (cho dropdown lọc và gắn thẻ)
  DESTINATIONS: [
    'Đà Nẵng',
    'Phú Quốc',
    'Sa Pa',
    'Hà Giang',
    'Đà Lạt',
    'Nha Trang',
    'Quy Nhơn',
    'Hà Nội',
    'Hội An',
    'Ninh Bình',
    'Hạ Long',
    'Huế',
    'Côn Đảo',
    'Phan Thiết',
    'Tokyo',
    'Seoul',
    'Bangkok',
    'Singapore',
  ],

  // Giới hạn upload ảnh bài viết
  UPLOAD: {
    MAX_IMAGES_PER_POST: 5,
    MAX_IMAGE_SIZE_BYTES: 2.5 * 1024 * 1024, // 2.5 MB
    MAX_IMAGE_SIZE_MB: 2.5,
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },

  // Lý do từ chối mẫu khi Admin kiểm duyệt
  REJECT_REASONS: [
    'Nội dung mang tính chất spam, quảng cáo thương mại hoặc bán hàng trái phép.',
    'Hình ảnh hoặc nội dung vi phạm bản quyền, sao chép từ nguồn khác mà không ghi rõ nguồn.',
    'Chứa ngôn từ thô tục, phản cảm, công kích cá nhân hoặc vi phạm thuần phong mỹ tục.',
    'Thông tin sai lệch nghiêm trọng về điểm đến, giá cả hoặc dịch vụ du lịch.',
    'Đánh giá không khách quan, nghi ngờ gian lận hoặc không đúng với trải nghiệm tour thực tế.',
    'Hình ảnh mờ, chất lượng quá thấp hoặc không liên quan tới nội dung bài viết.',
    'Khác (vui lòng ghi rõ lý do chi tiết)',
  ],

  // Danh sách từ khóa cấm / nhạy cảm
  PROHIBITED_KEYWORDS: [
    'cờ bạc',
    'đánh bạc',
    'lô đề',
    'cá độ',
    'cho vay',
    'tín dụng đen',
    'tiền ảo',
    'lừa đảo',
    'bán sim',
    'tăng follow',
    'hack like',
    'thuốc kích dục',
  ],

  // Cờ tự động duyệt bài (mặc định TẮT)
  AUTO_MODERATION: {
    ENABLED: false,
    MIN_APPROVED_POSTS: 3,
  },

  // Giới hạn bình luận
  COMMENTS: {
    MAX_DEPTH: 2,
    MAX_LENGTH: 1000,
  },
};

export const PROHIBITED_KEYWORDS = COMMUNITY_CONFIG.PROHIBITED_KEYWORDS;
export default COMMUNITY_CONFIG;


// ============================================================================
// HỒ SƠ DU LỊCH (dùng chung cho trang Hồ sơ du lịch và Trang cá nhân)
// ============================================================================

// 34 tỉnh thành (sau sáp nhập 07/2025). Frontend nhận danh sách này qua /api/community/my-summary
export const PROVINCES = [
  'Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Quảng Ninh', 'Thanh Hóa',
  'Nghệ An', 'Hà Tĩnh', 'Cao Bằng', 'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh',
  'Hưng Yên', 'Hải Phòng', 'Ninh Bình', 'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa',
  'Lâm Đồng', 'Đắk Lắk', 'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ', 'Vĩnh Long', 'Đồng Tháp',
  'Cà Mau', 'An Giang',
];

// Từ khóa (không dấu, chữ thường) để đưa tên điểm đến của tour về đúng tỉnh. Gồm cả tên tỉnh cũ đã sáp nhập.
// Điểm đến nước ngoài (Tokyo, Seoul…) không khớp tỉnh nào nên không tô bản đồ.
export const PROVINCE_KEYWORDS = {
  'Hà Nội': ['ha noi', 'hanoi'],
  'Huế': ['hue'],
  'Lai Châu': ['lai chau'],
  'Điện Biên': ['dien bien'],
  'Sơn La': ['son la', 'moc chau'],
  'Lạng Sơn': ['lang son'],
  'Quảng Ninh': ['quang ninh', 'ha long', 'van don', 'co to'],
  'Thanh Hóa': ['thanh hoa', 'sam son'],
  'Nghệ An': ['nghe an', 'cua lo'],
  'Hà Tĩnh': ['ha tinh'],
  'Cao Bằng': ['cao bang', 'ban gioc'],
  'Tuyên Quang': ['tuyen quang', 'ha giang', 'dong van', 'meo vac'],
  'Lào Cai': ['lao cai', 'sa pa', 'sapa', 'fansipan', 'bac ha'],
  'Thái Nguyên': ['thai nguyen'],
  'Phú Thọ': ['phu tho', 'hoa binh', 'mai chau'],
  'Bắc Ninh': ['bac ninh', 'bac giang'],
  'Hưng Yên': ['hung yen', 'thai binh'],
  'Hải Phòng': ['hai phong', 'cat ba', 'hai duong'],
  'Ninh Bình': ['ninh binh', 'trang an', 'tam coc', 'ha nam', 'nam dinh'],
  'Quảng Trị': ['quang tri', 'quang binh', 'phong nha'],
  'Đà Nẵng': ['da nang', 'hoi an', 'ba na', 'quang nam', 'tam ky'],
  'Quảng Ngãi': ['quang ngai', 'ly son', 'kon tum'],
  'Gia Lai': ['gia lai', 'quy nhon', 'binh dinh', 'pleiku'],
  'Khánh Hòa': ['khanh hoa', 'nha trang', 'cam ranh', 'ninh thuan', 'phan rang'],
  'Lâm Đồng': ['lam dong', 'da lat', 'dalat', 'phan thiet', 'mui ne', 'binh thuan', 'dak nong'],
  'Đắk Lắk': ['dak lak', 'buon ma thuot', 'phu yen', 'tuy hoa'],
  'TP. Hồ Chí Minh': ['ho chi minh', 'sai gon', 'saigon', 'tphcm', 'hcm', 'vung tau', 'ba ria', 'binh duong', 'con dao'],
  'Đồng Nai': ['dong nai', 'binh phuoc'],
  'Tây Ninh': ['tay ninh', 'long an'],
  'Cần Thơ': ['can tho', 'soc trang', 'hau giang'],
  'Vĩnh Long': ['vinh long', 'ben tre', 'tra vinh'],
  'Đồng Tháp': ['dong thap', 'tien giang', 'my tho'],
  'Cà Mau': ['ca mau', 'bac lieu'],
  'An Giang': ['an giang', 'phu quoc', 'kien giang', 'ha tien', 'rach gia', 'chau doc'],
};

// Quy tắc huy hiệu: chỉ cần đổi ngưỡng ở đây.
// metric: posts = số bài đã duyệt · provinces = số tỉnh đã đi · verifiedTrips = số chuyến đã xác thực
export const BADGE_RULES = [
  { id: 'newbie', name: 'Lữ khách mới', metric: 'posts', threshold: 1, unit: 'bài' },
  { id: 'storyteller', name: 'Người kể chuyện', metric: 'posts', threshold: 5, unit: 'bài' },
  { id: 'local', name: 'Thổ địa', metric: 'provinces', threshold: 3, unit: 'tỉnh' },
  { id: 'ambassador', name: 'Đại sứ GoReady', metric: 'verifiedTrips', threshold: 5, unit: 'bài' },
];

// GoPoint cộng một lần cho mỗi booking khi bài review gắn booking đó được duyệt
export const GOPOINT = { REVIEW_APPROVED: 500 };

export const PROFILE = { BIO_MAX_LENGTH: 160 };
