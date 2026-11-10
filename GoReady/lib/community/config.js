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

