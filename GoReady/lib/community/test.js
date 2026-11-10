import { getPool } from '../db.js';
import { sanitizeHtmlContent } from './sanitize.js';
import { checkRateLimit, resetRateLimits } from './rateLimit.js';
import {
  createPost,
  updatePost,
  moderatePost,
  setUserPostBan,
  toggleReaction,
  toggleSave,
  createComment,
  createReport,
  listPublicPosts,
  getPostBySlug
} from './service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAILED] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ [PASSED] ${message}`);
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 2: SERVICE & BUSINESS RULES ---\n');
  const pool = getPool();

  // Test 1: Sanitize HTML
  console.log('--- Test Suite 1: Sanitize HTML ---');
  {
    const maliciousHtml = `
      <h1>Tiêu đề an toàn</h1>
      <p>Nội dung hợp lệ <strong>chữ đậm</strong></p>
      <script>alert("XSS")</script>
      <img src="https://example.com/pic.jpg" onerror="alert('hack')" />
      <a href="javascript:alert(1)">Click me</a>
      <a href="https://goready.vn">GoReady</a>
      <iframe src="https://evil.com"></iframe>
    `;
    const clean = sanitizeHtmlContent(maliciousHtml);

    assert(!clean.includes('<script>'), 'Loại bỏ hoàn toàn thẻ <script>');
    assert(!clean.includes('onerror='), 'Loại bỏ thuộc tính inline event onerror');
    assert(!clean.includes('javascript:'), 'Loại bỏ giao thức nguy hiểm javascript: trong thẻ a');
    assert(!clean.includes('<iframe'), 'Loại bỏ thẻ <iframe> nguy hại');
    assert(clean.includes('<h1>Tiêu đề an toàn</h1>'), 'Giữ lại thẻ <h1>');
    assert(clean.includes('<strong>chữ đậm</strong>'), 'Giữ lại thẻ <strong>');
    assert(clean.includes('https://goready.vn'), 'Giữ lại liên kết an toàn https');
  }

  // Test 2: Rate Limit
  console.log('\n--- Test Suite 2: Rate Limiting ---');
  {
    resetRateLimits();
    const testIp = 'test-client-123';
    // Giới hạn reaction là 60 lần/phút
    let blocked = false;
    for (let i = 0; i < 70; i++) {
      const res = checkRateLimit(testIp, 'reaction');
      if (!res.allowed) {
        blocked = true;
        break;
      }
    }
    assert(blocked, 'Rate limiter chặn request khi vượt ngưỡng');

    // Action post: tối đa 5 lần / 10 phút
    const postIp = 'test-post-ip';
    for (let i = 0; i < 5; i++) {
      assert(checkRateLimit(postIp, 'post').allowed, `Cho phép đăng bài lần ${i + 1}`);
    }
    assert(!checkRateLimit(postIp, 'post').allowed, 'Chặn đăng bài ở lần thứ 6 trong cửa sổ trượt');
  }

  // Chuẩn bị User mock cho kiểm thử DB
  const adminUser = {
    id: 'user-admin-seed',
    email: 'admin@goready.vn',
    name: 'GoReady Admin',
    role: 'admin',
    status: 'active'
  };

  const normalUserA = {
    id: 'user-normal-a',
    email: 'usera@example.com',
    name: 'Nguyễn Văn A',
    role: 'user',
    status: 'active'
  };

  const normalUserB = {
    id: 'user-normal-b',
    email: 'userb@example.com',
    name: 'Trần Thị B',
    role: 'user',
    status: 'active'
  };

  // Test 3: Phân quyền Admin
  console.log('\n--- Test Suite 3: Quyền hạn Admin & User ---');
  {
    let caught403 = false;
    try {
      // User thường cố gắng gọi hàm kiểm duyệt
      await moderatePost(pool, 'post-fake', { action: 'approve' }, normalUserA);
    } catch (err) {
      if (err.status === 403) caught403 = true;
    }
    assert(caught403, 'User thường KHÔNG được phép gọi hàm kiểm duyệt bài viết (moderatePost -> 403)');

    let caughtBan403 = false;
    try {
      // User thường cố gắng khóa quyền đăng bài
      await setUserPostBan(pool, { userId: 'any', isBanned: true }, normalUserA);
    } catch (err) {
      if (err.status === 403) caughtBan403 = true;
    }
    assert(caughtBan403, 'User thường KHÔNG được phép khóa quyền đăng bài (setUserPostBan -> 403)');
  }

  // Test 4: Tạo bài viết thông thường & Luồng trạng thái
  console.log('\n--- Test Suite 4: Tạo bài & Luồng trạng thái (draft -> pending -> published -> update) ---');
  let createdPostId = null;
  let postSlug = null;
  {
    // Tạo bài viết bởi user A
    const postPayload = {
      kind: 'post',
      title: 'Kinh nghiệm du lịch Đà Lạt mùa đông tự túc',
      contentHtml: '<p>Đà Lạt mùa đông rất lạnh nhưng khung cảnh tuyệt đẹp...</p>',
      group: 'backpack',
      destination: 'Đà Lạt',
      hashtags: ['dalat', 'muadong']
    };

    const newPost = await createPost(pool, postPayload, normalUserA);
    assert(newPost && newPost.id, 'Tạo bài viết thành công và trả về ID');
    assert(newPost.status === 'pending', 'Bài người dùng tự tạo tự động có trạng thái pending');
    createdPostId = newPost.id;
    postSlug = newPost.slug;

    // Người ngoài xem bài pending -> bị 404
    let publicViewFailed = false;
    try {
      await getPostBySlug(pool, postSlug, null);
    } catch (err) {
      if (err.status === 404) publicViewFailed = true;
    }
    assert(publicViewFailed, 'Khách ngoài KHÔNG xem được bài khi đang ở trạng thái pending (404)');

    // Tác giả và Admin xem được bài pending
    const authorView = await getPostBySlug(pool, postSlug, normalUserA);
    assert(authorView && authorView.id === createdPostId, 'Chính tác giả xem được bài pending của mình');

    const adminView = await getPostBySlug(pool, postSlug, adminUser);
    assert(adminView && adminView.id === createdPostId, 'Admin xem được bài pending');

    // Admin duyệt bài -> published
    const approved = await moderatePost(pool, createdPostId, { action: 'approve' }, adminUser);
    assert(approved.status === 'published', 'Admin duyệt bài thành công -> chuyển sang published');

    // Khách ngoài xem được bài sau khi published
    const publicViewOk = await getPostBySlug(pool, postSlug, null);
    assert(publicViewOk && publicViewOk.status === 'published', 'Khách ngoài xem được bài đã published');

    // User khác (User B) cố tình sửa bài của User A -> bị chặn 403
    let forbiddenEdit = false;
    try {
      await updatePost(pool, createdPostId, { title: 'User B cố tình sửa tiêu đề' }, normalUserB);
    } catch (err) {
      if (err.status === 403) forbiddenEdit = true;
    }
    assert(forbiddenEdit, 'User B KHÔNG sửa được bài viết của User A (403 Forbidden)');

    // User A sửa bài đã published -> tự động quay lại pending để admin duyệt lại
    const updatedPost = await updatePost(pool, createdPostId, {
      title: 'Kinh nghiệm du lịch Đà Lạt mùa đông tự túc (Cập nhật mới)'
    }, normalUserA);
    assert(updatedPost.status === 'pending', 'Sửa bài viết đã published sẽ tự động quay lại trạng thái pending');
  }

  // Test 5: Quy tắc nghiệp vụ cho Review & Booking
  console.log('\n--- Test Suite 5: Kiểm tra nghiệp vụ Review Tour & Booking ---');
  {
    // Tạo tour mẫu để test booking nếu chưa có
    const tourRes = await pool.query('SELECT id, name FROM tours LIMIT 1');
    const testTourId = tourRes.rows[0]?.id || 'tour-test';

    // Tạo booking completed mẫu của user A
    const bookingId = `bk-test-${Date.now()}`;
    await pool.query(
      `INSERT INTO bookings (id, "tourId", "contactName", "contactEmail", "contactPhone", "totalPrice", status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 1000000, 'completed', NOW()::text)
       ON CONFLICT (id) DO NOTHING`,
      [bookingId, testTourId, normalUserA.name, normalUserA.email, '0901234567']
    );

    // 1. Review thiếu rating -> Bị lỗi 400
    let ratingMissing = false;
    try {
      await createPost(pool, {
        kind: 'review',
        title: 'Review Tour thiếu rating',
        contentHtml: '<p>Nội dung</p>',
        destination: 'Đà Nẵng',
        tourId: testTourId,
        bookingId: bookingId
      }, normalUserA);
    } catch (err) {
      if (err.status === 400) ratingMissing = true;
    }
    assert(ratingMissing, 'Đăng review bắt buộc phải có số sao rating (1-5)');

    // 2. User B cố gắng dùng booking của User A -> Bị lỗi 403
    let bookingBelongError = false;
    try {
      await createPost(pool, {
        kind: 'review',
        title: 'User B mạo danh booking User A',
        contentHtml: '<p>Nội dung</p>',
        destination: 'Đà Nẵng',
        tourId: testTourId,
        bookingId: bookingId,
        rating: 5
      }, normalUserB);
    } catch (err) {
      if (err.status === 403) bookingBelongError = true;
    }
    assert(bookingBelongError, 'Không cho phép user khác dùng booking không thuộc về mình');

    // 3. User A tạo review hợp lệ lần 1 -> Thành công
    const reviewPost = await createPost(pool, {
      kind: 'review',
      title: 'Đánh giá chuyến đi tuyệt vời',
      contentHtml: '<p>Chuyến đi rất chu đáo và vui vẻ.</p>',
      destination: 'Đà Nẵng',
      tourId: testTourId,
      bookingId: bookingId,
      rating: 5
    }, normalUserA);
    assert(reviewPost && reviewPost.bookingId === bookingId, 'User A gắn review vào booking completed thành công');

    // 4. Booking đã gắn bài -> Cố tình tạo thêm review thứ 2 cho cùng booking -> Bị lỗi 409
    let duplicateBooking = false;
    try {
      await createPost(pool, {
        kind: 'review',
        title: 'Đánh giá lần 2 cho cùng 1 booking',
        contentHtml: '<p>Nội dung thứ 2</p>',
        destination: 'Đà Nẵng',
        tourId: testTourId,
        bookingId: bookingId,
        rating: 4
      }, normalUserA);
    } catch (err) {
      if (err.status === 409) duplicateBooking = true;
    }
    assert(duplicateBooking, 'Một mã booking KHÔNG thể gắn cho 2 bài review khác nhau (409 Conflict)');
  }

  // Test 6: User bị chặn đăng bài (community_user_flags)
  console.log('\n--- Test Suite 6: Chặn user đăng bài (community_user_flags) ---');
  {
    // Admin chặn User A
    await setUserPostBan(pool, { userId: normalUserA.id, isBanned: true, note: 'Spam vi phạm quy tắc' }, adminUser);

    let userBannedBlocked = false;
    try {
      await createPost(pool, {
        kind: 'post',
        title: 'Bài viết khi đang bị chặn',
        contentHtml: '<p>Nội dung bài viết</p>'
      }, normalUserA);
    } catch (err) {
      if (err.status === 403) userBannedBlocked = true;
    }
    assert(userBannedBlocked, 'User có cờ is_post_banned bị chặn tạo bài viết mới (403)');

    // Admin mở chặn cho User A
    await setUserPostBan(pool, { userId: normalUserA.id, isBanned: false, note: 'Đã nhắc nhở' }, adminUser);
  }

  // Dọn dẹp các bài test tạm thời
  if (createdPostId) {
    await pool.query('DELETE FROM community_posts WHERE id = $1', [createdPostId]);
  }

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐẠT YÊU CẦU!`);
  console.log(`========================================\n`);

  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
  process.exit(1);
});
