import { getPool } from '../db.js';
import { ensureCommunitySchema } from './schema.js';
import bcrypt from 'bcrypt';

export async function seedCommunityData(pool) {
  await ensureCommunitySchema(pool);

  console.log('[Community Seed] Bắt đầu khởi tạo dữ liệu mẫu...');

  // 1. Khởi tạo 3 user mẫu nếu chưa tồn tại
  const SEED_USERS = [
    {
      id: 'usr-seed-an',
      name: 'Nguyễn Văn An [Seed]',
      email: 'nguyenvanan.seed@goready.vn',
      phone: '0901234567',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
    },
    {
      id: 'usr-seed-binh',
      name: 'Trần Thị Bình [Seed]',
      email: 'tranthibinh.seed@goready.vn',
      phone: '0912345678',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
    },
    {
      id: 'usr-seed-cuong',
      name: 'Lê Minh Cường [Seed]',
      email: 'leminhcuong.seed@goready.vn',
      phone: '0923456789',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&q=80',
    },
  ];

  const defaultPasswordHash = await bcrypt.hash('GoReady@2025!', 10);
  for (const u of SEED_USERS) {
    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1 OR lower(email) = lower($2)', [u.id, u.email]);
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO users (id, name, email, phone, "joinedAt", "totalBookings", status, password_hash, role, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)`,
        [u.id, u.name, u.email, u.phone, '2026-01-15', 2, defaultPasswordHash, u.role, u.avatar]
      );
    }
  }

  // 2. Tạo bookings mẫu tương ứng cho các user để viết Verified Review
  const SEED_BOOKINGS = [
    {
      id: 'bk-seed-danang-001',
      bookingCode: 'GR-DANANG01',
      tourId: 'danang-hoian',
      contactEmail: 'nguyenvanan.seed@goready.vn',
      contactName: 'Nguyễn Văn An [Seed]',
      status: 'completed',
    },
    {
      id: 'bk-seed-phuquoc-002',
      bookingCode: 'GR-PHUQUOC02',
      tourId: 'phu-quoc',
      contactEmail: 'tranthibinh.seed@goready.vn',
      contactName: 'Trần Thị Bình [Seed]',
      status: 'completed',
    },
    {
      id: 'bk-seed-hagiang-003',
      bookingCode: 'GR-HAGIANG03',
      tourId: 'ha-giang-loop',
      contactEmail: 'leminhcuong.seed@goready.vn',
      contactName: 'Lê Minh Cường [Seed]',
      status: 'completed',
    },
    {
      id: 'bk-seed-nhatrang-004',
      bookingCode: 'GR-NHATRANG04',
      tourId: 'nha-trang',
      contactEmail: 'tranthibinh.seed@goready.vn',
      contactName: 'Trần Thị Bình [Seed]',
      status: 'completed',
    },
  ];

  for (const b of SEED_BOOKINGS) {
    const { rows } = await pool.query('SELECT id FROM bookings WHERE id = $1', [b.id]);
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO bookings (id, "bookingCode", "tourId", "departureDate", adults, children, infants, "addOns",
           "contactName", "contactPhone", "contactEmail", "totalPrice", "paymentMethod", status, "createdAt",
           "guideName", "guidePhone", "hotelName", "pickupTime", "pickupLocation")
         VALUES ($1, $2, $3, '2026-03-10', 2, 1, 0, '[]'::jsonb, $4, '0901234567', $5, 5990000, 'card', $6,
           '2026-03-01T10:00:00.000Z', 'Nguyễn Hướng Dẫn', '0909999888', 'Khách sạn Novotel', '07:30', 'Sân bay')`,
        [b.id, b.bookingCode, b.tourId, b.contactName, b.contactEmail, b.status]
      );
    }
  }

  // 3. Xoá dữ liệu seed cũ trong các bảng community_* để đảm bảo chạy idempotent
  await pool.query(`DELETE FROM community_reports WHERE id LIKE 'rep-seed-%'`);
  await pool.query(`DELETE FROM community_reactions WHERE id LIKE 'react-seed-%'`);
  await pool.query(`DELETE FROM community_saves WHERE id LIKE 'save-seed-%'`);
  await pool.query(`DELETE FROM community_comments WHERE id LIKE 'cmt-seed-%'`);
  await pool.query(`DELETE FROM community_post_media WHERE id LIKE 'media-seed-%'`);
  await pool.query(`DELETE FROM community_posts WHERE id LIKE 'post-seed-%'`);

  // 4. Danh sách 10 bài viết mẫu
  const SEED_POSTS = [
    // Bài 1: Bài Admin chính thức (Ghim, Official)
    {
      id: 'post-seed-01',
      author_id: 'admin-official',
      author_name: 'GoReady',
      author_avatar: null,
      author_email: 'admin@goready.vn',
      slug: 'chao-mung-den-voi-cong-dong-du-lich-goready',
      kind: 'post',
      title: 'Chào mừng bạn đến với Cộng đồng Du lịch GoReady!',
      excerpt: 'Không gian mở để chia sẻ những khoảnh khắc đẹp, review chân thực và bí quyết du lịch hữu ích.',
      content_html: `<p>Chào mừng toàn thể thành viên đến với <strong>Cộng đồng GoReady</strong>! 🎉</p>
<p>Đây là ngôi nhà chung dành cho những tâm hồn mê xê dịch. Tại đây, bạn có thể:</p>
<ul>
  <li>Chia sẻ bài viết, trải nghiệm và mẹo hay cho các chuyến đi.</li>
  <li>Đánh giá (Review) các tour bạn đã hoàn thành với huy hiệu <strong>Verified Tour</strong> minh bạch.</li>
  <li>Khám phá lịch trình, điểm check-in hấp dẫn từ chính những người bạn đồng hành.</li>
</ul>
<p>Chúc các bạn luôn có những chuyến đi tràn đầy cảm hứng và an toàn!</p>`,
      cover_image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=800&fit=crop&q=80',
      group: 'family',
      destination: 'Phú Quốc',
      hashtags: JSON.stringify(['GoReady', 'CongDongDuLich', 'KinhNghiem']),
      tour_id: 'phu-quoc',
      booking_id: null,
      rating: null,
      is_official: true,
      is_pinned: true,
      status: 'published',
      published_at: '2026-03-01T08:00:00.000Z',
      created_at: '2026-03-01T08:00:00.000Z',
      updated_at: '2026-03-01T08:00:00.000Z',
      likes_count: 42,
      comments_count: 5,
      views_count: 320,
    },

    // Bài 2: Review Tour có gắn tour (Verified) - Gia đình
    {
      id: 'post-seed-02',
      author_id: 'usr-seed-an',
      author_name: 'Nguyễn Văn An [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      author_email: 'nguyenvanan.seed@goready.vn',
      slug: 'kinh-nghiem-thuc-te-dua-be-3-tuoi-di-ba-na-hills',
      kind: 'review',
      title: 'Kinh nghiệm thực tế đưa bé 3 tuổi đi Bà Nà Hills và Hội An 3N2Đ',
      excerpt: 'Chuyến đi vừa rồi nhà mình đi tour Đà Nẵng - Hội An của GoReady, dịch vụ xe đưa đón rất chu đáo, đặc biệt hướng dẫn viên nhiệt tình hỗ trợ gia đình có con nhỏ.',
      content_html: `<p>Vừa kết thúc chuyến du lịch Đà Nẵng - Hội An 3N2Đ cùng gia đình, mình muốn chia sẻ một vài kinh nghiệm thực tế cho bố mẹ có con nhỏ:</p>
<p><strong>1. Di chuyển & Cáp treo Bà Nà:</strong> Xe tour đưa đón đúng giờ, xe đời mới máy lạnh êm. Lên Bà Nà thời tiết thay đổi nhanh nên nhớ chuẩn bị áo khoác mỏng và xe đẩy nhỏ gọn cho bé.</p>
<p><strong>2. Ẩm thực:</strong> Các bữa ăn trong tour khá vừa miệng, nhà hàng có ghế trẻ em và sẵn sàng nấu cháo riêng cho bé khi gia đình nhờ.</p>
<p><strong>3. Đánh giá chung:</strong> 5/5 sao cho sự tận tâm của bạn HDV! Rất đáng tiền.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&h=800&fit=crop&q=80',
      group: 'family',
      destination: 'Đà Nẵng',
      hashtags: JSON.stringify(['DaNang', 'BaNaHills', 'DuLichGiaDinh', 'ReviewTour']),
      tour_id: 'danang-hoian',
      booking_id: 'bk-seed-danang-001',
      rating: 5,
      is_official: false,
      is_pinned: false,
      status: 'published',
      published_at: '2026-03-05T09:30:00.000Z',
      created_at: '2026-03-05T09:00:00.000Z',
      updated_at: '2026-03-05T09:30:00.000Z',
      likes_count: 28,
      comments_count: 3,
      views_count: 185,
    },

    // Bài 3: Review Tour Phú Quốc (Verified)
    {
      id: 'post-seed-03',
      author_id: 'usr-seed-binh',
      author_name: 'Trần Thị Bình [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
      author_email: 'tranthibinh.seed@goready.vn',
      slug: 'phu-quoc-4n3d-nghi-duong-thien-duong-bien-dao',
      kind: 'review',
      title: 'Phú Quốc 4N3Đ: Nghỉ dưỡng biển đẳng cấp và cáp treo Hòn Thơm ngoạn mục',
      excerpt: 'Hoàng hôn Sunset Sanato đẹp mê hồn, cáp treo vượt biển dài nhất thế giới rất ấn tượng. Resort Sunset Sanato phòng ốc sạch đẹp sát biển.',
      content_html: `<p>Lần thứ 2 quay lại Phú Quốc nhưng đi theo tour GoReady thấy nhàn hơn hẳn. Lịch trình sắp xếp hợp lý, không bị dồn dập.</p>
<p>Điểm cộng lớn nhất là bữa tối hải sản tại làng chài Hàm Ninh rất tươi ngon và view ngắm hoàng hôn Dinh Cậu tuyệt đẹp.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=800&fit=crop&q=80',
      group: 'family',
      destination: 'Phú Quốc',
      hashtags: JSON.stringify(['PhuQuoc', 'BienDao', 'NghiDuong']),
      tour_id: 'phu-quoc',
      booking_id: 'bk-seed-phuquoc-002',
      rating: 5,
      is_official: false,
      is_pinned: false,
      status: 'published',
      published_at: '2026-03-08T14:15:00.000Z',
      created_at: '2026-03-08T14:00:00.000Z',
      updated_at: '2026-03-08T14:15:00.000Z',
      likes_count: 19,
      comments_count: 2,
      views_count: 142,
    },

    // Bài 4: Review Tour Hà Giang (Verified) - Phượt
    {
      id: 'post-seed-04',
      author_id: 'usr-seed-cuong',
      author_name: 'Lê Minh Cường [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&q=80',
      author_email: 'leminhcuong.seed@goready.vn',
      slug: 'ha-giang-loop-cung-duong-huyen-thoai-3n2d',
      kind: 'review',
      title: 'Hà Giang Loop 3N2Đ — Cung đường huyền thoại thử thách tuổi trẻ',
      excerpt: 'Đèo Mã Pí Lèng hùng vĩ, chèo kayak trên sông Nho Quế nước xanh như ngọc bích. Trải nghiệm khó quên trong đời.',
      content_html: `<p>Tour Hà Giang Loop của GoReady rất thích hợp cho những ai muốn chinh phục địa đầu Tổ quốc nhưng vẫn đảm bảo an toàn.</p>
<p>Bác tài xế tay lái cực lụa trên những khúc cua tay áo, homestay ở Đồng Văn view núi cực chill!</p>`,
      cover_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=800&fit=crop&q=80',
      group: 'backpack',
      destination: 'Hà Giang',
      hashtags: JSON.stringify(['HaGiangLoop', 'MaPiLeng', 'NhoQue', 'Phuot']),
      tour_id: 'ha-giang-loop',
      booking_id: 'bk-seed-hagiang-003',
      rating: 4,
      is_official: false,
      is_pinned: false,
      status: 'published',
      published_at: '2026-03-12T11:00:00.000Z',
      created_at: '2026-03-12T10:45:00.000Z',
      updated_at: '2026-03-12T11:00:00.000Z',
      likes_count: 35,
      comments_count: 4,
      views_count: 210,
    },

    // Bài 5: Bài viết thường - Sa Pa (Sinh viên / Giới trẻ)
    {
      id: 'post-seed-05',
      author_id: 'usr-seed-cuong',
      author_name: 'Lê Minh Cường [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&q=80',
      author_email: 'leminhcuong.seed@goready.vn',
      slug: 'san-may-dinh-fansipan-va-checkin-ban-cat-cat',
      kind: 'post',
      title: 'Hành trình săn mây đỉnh Fansipan và check-in bản Cát Cát mùa này',
      excerpt: 'Những góc chụp ảnh sống ảo triệu view tại Sa Pa không phải ai cũng biết, cùng kinh nghiệm thuê trang phục dân tộc đẹp ngất ngây.',
      content_html: `<p>Mùa này Sa Pa sáng sớm mây luồn đẹp ngỡ ngàng. Nếu bạn muốn có bộ ảnh để đời ở bản Cát Cát, hãy đi vào tầm 8h sáng lúc nắng vừa lên.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=1200&h=800&fit=crop&q=80',
      group: 'student',
      destination: 'Sa Pa',
      hashtags: JSON.stringify(['SaPa', 'Fansipan', 'CatCat', 'SongAo']),
      tour_id: null,
      booking_id: null,
      rating: null,
      is_official: false,
      is_pinned: false,
      status: 'published',
      published_at: '2026-03-14T16:00:00.000Z',
      created_at: '2026-03-14T15:30:00.000Z',
      updated_at: '2026-03-14T16:00:00.000Z',
      likes_count: 22,
      comments_count: 1,
      views_count: 165,
    },

    // Bài 6: Bài viết thường - Săn deal Đà Lạt (Deal)
    {
      id: 'post-seed-06',
      author_id: 'usr-seed-binh',
      author_name: 'Trần Thị Bình [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
      author_email: 'tranthibinh.seed@goready.vn',
      slug: 'bi-kip-vi-vu-da-lat-3n2d-tiet-kiem-chi-2-trieu',
      kind: 'post',
      title: 'Bí kíp vi vu Đà Lạt 3N2Đ tiết kiệm chỉ với 2 triệu đồng / người',
      excerpt: 'Tổng hợp các quán cà phê view thung lũng không phụ thu, homestay xinh xắn giá rẻ và các địa điểm tham quan miễn phí vé.',
      content_html: `<p>Ai bảo đi Đà Lạt là tốn kém? Với kế hoạch chi tiêu hợp lý này, nhóm mình 4 người vừa có chuyến đi cực kỳ đáng nhớ mà ví vẫn rủng rỉnh.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&h=800&fit=crop&q=80',
      group: 'deal',
      destination: 'Đà Lạt',
      hashtags: JSON.stringify(['DaLat', 'DuLichTietKiem', 'SanDeal']),
      tour_id: null,
      booking_id: null,
      rating: null,
      is_official: false,
      is_pinned: false,
      status: 'published',
      published_at: '2026-03-16T10:00:00.000Z',
      created_at: '2026-03-16T09:40:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
      likes_count: 45,
      comments_count: 6,
      views_count: 290,
    },

    // Bài 7: Bài chờ duyệt (PENDING)
    {
      id: 'post-seed-07',
      author_id: 'usr-seed-an',
      author_name: 'Nguyễn Văn An [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      author_email: 'nguyenvanan.seed@goready.vn',
      slug: 'kinh-nghiem-an-sap-cho-dem-quy-nhon',
      kind: 'post',
      title: 'Kinh nghiệm ăn sập chợ đêm Quy Nhơn với 100k',
      excerpt: 'Bánh xèo tôm nhảy, nem nướng, chè nhớ... những món ăn vặt đường phố không thể bỏ qua khi ghé thăm thành phố thi ca.',
      content_html: `<p>Ẩm thực Quy Nhơn vừa rẻ vừa đậm đà. Mình xin liệt kê danh sách 5 món nhất định phải thử khi dạo quanh khu ẩm thực Ngô Văn Sở.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop&q=80',
      group: 'student',
      destination: 'Quy Nhơn',
      hashtags: JSON.stringify(['QuyNhon', 'AmThuc', 'AnVat']),
      tour_id: null,
      booking_id: null,
      rating: null,
      is_official: false,
      is_pinned: false,
      status: 'pending',
      published_at: null,
      created_at: '2026-03-18T14:00:00.000Z',
      updated_at: '2026-03-18T14:00:00.000Z',
      likes_count: 0,
      comments_count: 0,
      views_count: 5,
    },

    // Bài 8: Review đang chờ duyệt (PENDING Review)
    {
      id: 'post-seed-08',
      author_id: 'usr-seed-binh',
      author_name: 'Trần Thị Bình [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
      author_email: 'tranthibinh.seed@goready.vn',
      slug: 'lan-ngam-san-ho-tai-hon-mun-nha-trang',
      kind: 'review',
      title: 'Lặn ngắm san hô tại Hòn Mun — Điểm nhấn của tour Nha Trang 3N2Đ',
      excerpt: 'Nước biển trong vắt nhìn thấy cả đáy, san hô tự nhiên đa sắc màu và cano lướt sóng cực kỳ êm ái.',
      content_html: `<p>Tour Nha Trang vừa rồi mang lại cảm giác sảng khoái tuyệt đối. Hướng dẫn viên hướng dẫn cách thở và đeo kính lặn rất tận tâm.</p>`,
      cover_image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop&q=80',
      group: 'family',
      destination: 'Nha Trang',
      hashtags: JSON.stringify(['NhaTrang', 'HonMun', 'LanBien']),
      tour_id: 'nha-trang',
      booking_id: 'bk-seed-nhatrang-004',
      rating: 5,
      is_official: false,
      is_pinned: false,
      status: 'pending',
      published_at: null,
      created_at: '2026-03-19T09:20:00.000Z',
      updated_at: '2026-03-19T09:20:00.000Z',
      likes_count: 0,
      comments_count: 0,
      views_count: 3,
    },

    // Bài 9: Bài bị từ chối kiểm duyệt (REJECTED)
    {
      id: 'post-seed-09',
      author_id: 'usr-seed-cuong',
      author_name: 'Lê Minh Cường [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&q=80',
      author_email: 'leminhcuong.seed@goready.vn',
      slug: 'thanh-ly-combo-du-lich-da-nang-gia-soc',
      kind: 'post',
      title: 'Cần thanh lý gấp 2 vé combo khách sạn 5 sao Đà Nẵng giá sốc liên hệ Zalo',
      excerpt: 'Bận việc gia đình cần pass lại gấp 2 voucher resort Furama Đà Nẵng giá chỉ 50%, liên hệ ngay Zalo 0988xxxxxx.',
      content_html: `<p>Do bận việc đột xuất cần sang nhượng gấp giá cực rẻ, ai quan tâm liên hệ sđt...</p>`,
      cover_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop&q=80',
      group: 'deal',
      destination: 'Đà Nẵng',
      hashtags: JSON.stringify(['ThanhLy', 'GiaSoc']),
      tour_id: null,
      booking_id: null,
      rating: null,
      is_official: false,
      is_pinned: false,
      status: 'rejected',
      reject_reason: 'Nội dung mang tính chất spam, quảng cáo thương mại hoặc bán hàng trái phép.',
      reviewed_by: 'admin@goready.vn',
      reviewed_at: '2026-03-20T10:00:00.000Z',
      published_at: null,
      created_at: '2026-03-20T08:00:00.000Z',
      updated_at: '2026-03-20T10:00:00.000Z',
      likes_count: 0,
      comments_count: 0,
      views_count: 2,
    },

    // Bài 10: Bài bị ẩn bởi Admin (HIDDEN)
    {
      id: 'post-seed-10',
      author_id: 'usr-seed-an',
      author_name: 'Nguyễn Văn An [Seed]',
      author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      author_email: 'nguyenvanan.seed@goready.vn',
      slug: 'dia-diem-cam-trai-tu-phat-ho-tuyen-lam',
      kind: 'post',
      title: 'Tọa độ cắm trại tự phát bên bờ hồ Tuyền Lâm cực vắng vẻ',
      excerpt: 'Khu vực bãi cỏ vắng người ven hồ, có thể đốt lửa trại tự do không ai nhắc nhở.',
      content_html: `<p>Tọa độ này rất đẹp nhưng hiện tại chính quyền địa phương đã cắm biển cấm đốt lửa tự do để bảo tồn rừng thông...</p>`,
      cover_image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1200&h=800&fit=crop&q=80',
      group: 'backpack',
      destination: 'Đà Lạt',
      hashtags: JSON.stringify(['CamTrai', 'DaLat']),
      tour_id: null,
      booking_id: null,
      rating: null,
      is_official: false,
      is_pinned: false,
      status: 'hidden',
      reject_reason: 'Khu vực đã cấm cắm trại tự phát để phòng chống cháy rừng theo thông báo địa phương.',
      reviewed_by: 'admin@goready.vn',
      reviewed_at: '2026-03-21T15:00:00.000Z',
      published_at: '2026-03-21T09:00:00.000Z',
      created_at: '2026-03-21T08:30:00.000Z',
      updated_at: '2026-03-21T15:00:00.000Z',
      likes_count: 5,
      comments_count: 1,
      views_count: 45,
    },
  ];

  for (const p of SEED_POSTS) {
    await pool.query(
      `INSERT INTO community_posts (
        id, author_id, author_name, author_avatar, author_email, slug, kind, title, content_html, excerpt,
        cover_image, "group", destination, hashtags, tour_id, booking_id, rating, is_official, is_pinned,
        status, reject_reason, reviewed_by, reviewed_at, published_at, created_at, updated_at,
        likes_count, comments_count, views_count
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
      [
        p.id,
        p.author_id,
        p.author_name,
        p.author_avatar,
        p.author_email,
        p.slug,
        p.kind,
        p.title,
        p.content_html,
        p.excerpt,
        p.cover_image,
        p.group,
        p.destination,
        p.hashtags,
        p.tour_id,
        p.booking_id,
        p.rating,
        p.is_official,
        p.is_pinned,
        p.status,
        p.reject_reason || null,
        p.reviewed_by || null,
        p.reviewed_at || null,
        p.published_at || null,
        p.created_at,
        p.updated_at,
        p.likes_count,
        p.comments_count,
        p.views_count,
      ]
    );

    // Gắn 2 ảnh media vào bảng community_post_media cho mỗi bài có coverImage
    if (p.cover_image) {
      await pool.query(
        `INSERT INTO community_post_media (id, post_id, url, "order", alt)
         VALUES ($1, $2, $3, 1, $4), ($5, $2, $3, 2, $4)`,
        [`media-seed-${p.id}-1`, p.id, p.cover_image, p.title, `media-seed-${p.id}-2`]
      );
    }
  }

  // 5. Bình luận 2 cấp mẫu cho bài viết post-seed-02
  const SEED_COMMENTS = [
    {
      id: 'cmt-seed-01',
      post_id: 'post-seed-02',
      user_id: 'usr-seed-binh',
      user_name: 'Trần Thị Bình [Seed]',
      user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
      parent_id: null,
      content: 'Cảm ơn anh An đã chia sẻ! Cho em hỏi bé nhà em hay say xe thì đi cung đường lên Bà Nà có bị say nhiều không ạ?',
      status: 'visible',
      created_at: '2026-03-05T10:15:00.000Z',
    },
    {
      id: 'cmt-seed-02',
      post_id: 'post-seed-02',
      user_id: 'usr-seed-an',
      user_name: 'Nguyễn Văn An [Seed]',
      user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      parent_id: 'cmt-seed-01', // Comment cấp 2 (trả lời cmt-seed-01)
      content: 'Đường từ trung tâm Đà Nẵng lên chân núi Bà Nà là đường cao tốc thẳng tắp rất êm bạn nhé, không có đèo dốc nên bé nhà mình không say chút nào đâu!',
      status: 'visible',
      created_at: '2026-03-05T10:30:00.000Z',
    },
    {
      id: 'cmt-seed-03',
      post_id: 'post-seed-02',
      user_id: 'usr-seed-cuong',
      user_name: 'Lê Minh Cường [Seed]',
      user_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&q=80',
      parent_id: null,
      content: 'Tour này có ghé phố cổ Hội An buổi tối thả hoa đăng không anh?',
      status: 'visible',
      created_at: '2026-03-06T08:00:00.000Z',
    },
    {
      id: 'cmt-seed-04',
      post_id: 'post-seed-02',
      user_id: 'usr-seed-an',
      user_name: 'Nguyễn Văn An [Seed]',
      user_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      parent_id: 'cmt-seed-03', // Comment cấp 2
      content: 'Có em ơi, tối ngày thứ 2 tour cho tự do dạo phố cổ và trải nghiệm chèo thuyền thả hoa đăng trên sông Hoài cực đẹp nhé.',
      status: 'visible',
      created_at: '2026-03-06T08:20:00.000Z',
    },
  ];

  for (const c of SEED_COMMENTS) {
    await pool.query(
      `INSERT INTO community_comments (id, post_id, user_id, user_name, user_avatar, parent_id, content, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [c.id, c.post_id, c.user_id, c.user_name, c.user_avatar, c.parent_id, c.content, c.status, c.created_at]
    );
  }

  // 6. Lượt thích (Reactions) mẫu
  const SEED_REACTIONS = [
    { id: 'react-seed-01', user_id: 'usr-seed-an', post_id: 'post-seed-01', type: 'like' },
    { id: 'react-seed-02', user_id: 'usr-seed-binh', post_id: 'post-seed-01', type: 'like' },
    { id: 'react-seed-03', user_id: 'usr-seed-cuong', post_id: 'post-seed-01', type: 'like' },
    { id: 'react-seed-04', user_id: 'usr-seed-binh', post_id: 'post-seed-02', type: 'like' },
    { id: 'react-seed-05', user_id: 'usr-seed-cuong', post_id: 'post-seed-02', type: 'like' },
  ];

  for (const r of SEED_REACTIONS) {
    await pool.query(
      `INSERT INTO community_reactions (id, user_id, post_id, type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, post_id, type) DO NOTHING`,
      [r.id, r.user_id, r.post_id, r.type]
    );
  }

  // 7. Bài viết đã lưu (Saves) mẫu
  const SEED_SAVES = [
    { id: 'save-seed-01', user_id: 'usr-seed-binh', post_id: 'post-seed-02' },
    { id: 'save-seed-02', user_id: 'usr-seed-cuong', post_id: 'post-seed-06' },
  ];

  for (const s of SEED_SAVES) {
    await pool.query(
      `INSERT INTO community_saves (id, user_id, post_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, post_id) DO NOTHING`,
      [s.id, s.user_id, s.post_id]
    );
  }

  // 8. Báo cáo vi phạm mẫu
  const SEED_REPORTS = [
    {
      id: 'rep-seed-01',
      reporter_id: 'usr-seed-an',
      reporter_name: 'Nguyễn Văn An [Seed]',
      target_type: 'post',
      target_id: 'post-seed-09',
      reason: 'Bài viết quảng cáo bán voucher cá nhân và yêu cầu nhắn tin Zalo nghi vấn lừa đảo.',
      status: 'resolved',
      handled_by: 'admin@goready.vn',
      created_at: '2026-03-20T09:00:00.000Z',
    },
    {
      id: 'rep-seed-02',
      reporter_id: 'usr-seed-binh',
      reporter_name: 'Trần Thị Bình [Seed]',
      target_type: 'post',
      target_id: 'post-seed-10',
      reason: 'Địa điểm cắm trại này hiện đã bị cấm đốt lửa trại để phòng chống cháy rừng.',
      status: 'resolved',
      handled_by: 'admin@goready.vn',
      created_at: '2026-03-21T11:00:00.000Z',
    },
  ];

  for (const rep of SEED_REPORTS) {
    await pool.query(
      `INSERT INTO community_reports (id, reporter_id, reporter_name, target_type, target_id, reason, status, handled_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [rep.id, rep.reporter_id, rep.reporter_name, rep.target_type, rep.target_id, rep.reason, rep.status, rep.handled_by, rep.created_at]
    );
  }

  console.log('[Community Seed] Hoàn tất nạp dữ liệu mẫu cho phân hệ Cộng đồng:');
  console.log(`- 3 Users mẫu: Nguyễn Văn An, Trần Thị Bình, Lê Minh Cường (mật khẩu: GoReady@2025!)`);
  console.log(`- 10 Bài viết (1 bài admin chính thức, 4 review verified gắn tour, 5 bài chia sẻ thường)`);
  console.log(`- Đầy đủ các trạng thái bài viết: published, pending, rejected, hidden`);
  console.log(`- 4 Bình luận 2 cấp, 5 lượt thích, 2 bài đã lưu, 2 báo cáo vi phạm.`);
}

// Chạy trực tiếp qua node: node GoReady/lib/community/seed.js
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lib/community/seed.js')) {
  const pool = getPool();
  try {
    await seedCommunityData(pool);
  } catch (err) {
    console.error('[Community Seed] Lỗi khi nạp seed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

