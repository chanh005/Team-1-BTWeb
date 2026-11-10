import { randomUUID } from 'node:crypto';
import { sanitizeHtml, extractExcerpt } from './sanitize.js';
import { rateLimiter, RATE_LIMITS } from './rateLimit.js';
import COMMUNITY_CONFIG from './config.js';

export function formatPostRow(r) {
  if (!r) return null;
  return {
    ...r,
    authorId: r.author_id,
    contentHtml: r.content_html,
    coverImage: r.cover_image,
    tourId: r.tour_id,
    bookingId: r.booking_id,
    isOfficial: r.is_official,
    isPinned: r.is_pinned,
    rejectReason: r.reject_reason,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    likesCount: r.likes_count ?? 0,
    commentsCount: r.comments_count ?? 0,
    viewsCount: r.views_count ?? 0,
  };
}

// Helper tạo slug tiếng Việt chuẩn SEO kèm hash ngẫu nhiên
export function generateSlug(title) {
  if (!title) return `bai-viet-${Date.now().toString(36)}`;
  let slug = title.toLowerCase();
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/đ/g, 'd').replace(/Đ/g, 'd');
  slug = slug.replace(/[^a-z0-9\s-]/g, '').trim();
  slug = slug.replace(/[\s-]+/g, '-');
  const shortHash = Math.random().toString(36).slice(2, 7);
  return `${slug.slice(0, 60)}-${shortHash}`;
}

// Helper kiểm tra quyền Admin
export function assertAdmin(user) {
  if (!user || user.role !== 'admin') {
    const err = new Error('Chỉ quản trị viên mới có quyền thực hiện thao tác này.');
    err.status = 403;
    throw err;
  }
}

// ============================================================================
// BÀI VIẾT (POSTS & REVIEWS)
// ============================================================================

/**
 * Danh sách bài viết công khai (chỉ published, có filter, sort, pagination)
 */
export async function listPublicPosts(pool, options = {}, currentUserId = null) {
  const {
    group,
    destination,
    kind,
    sortBy = 'newest', // 'newest' | 'popular'
    page = 1,
    limit = 10,
  } = options;

  const conditions = ["p.status = 'published'"];
  const values = [];

  if (group && group !== 'all') {
    values.push(group);
    conditions.push(`p."group" = $${values.length}`);
  }

  if (destination && destination !== 'all') {
    values.push(destination);
    conditions.push(`p.destination = $${values.length}`);
  }

  if (kind && kind !== 'all') {
    values.push(kind);
    conditions.push(`p.kind = $${values.length}`);
  }

  const offset = Math.max(0, (page - 1) * limit);
  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  let orderClause = 'p.is_pinned DESC, p.published_at DESC';
  if (sortBy === 'popular') {
    orderClause = 'p.is_pinned DESC, (p.likes_count * 2 + p.comments_count * 3 + p.views_count) DESC, p.published_at DESC';
  }

  // Truy vấn danh sách bài viết
  const sql = `
    SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object('id', m.id, 'url', m.url, 'order', m."order", 'alt', m.alt)
        ) FILTER (WHERE m.id IS NOT NULL), '[]'::json
      ) as media
    FROM community_posts p
    LEFT JOIN community_post_media m ON p.id = m.post_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id
    ORDER BY ${orderClause}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await pool.query(sql, values);

  // Đếm tổng số bài viết phù hợp
  const countSql = `SELECT count(*)::int as total FROM community_posts p WHERE ${conditions.join(' AND ')}`;
  const countResult = await pool.query(countSql, values.slice(0, -2));
  const total = countResult.rows[0]?.total ?? 0;

  // Nếu người dùng đang đăng nhập: gắn cờ isLiked, isSaved
  if (currentUserId && rows.length > 0) {
    const postIds = rows.map((r) => r.id);
    const [likesRes, savesRes] = await Promise.all([
      pool.query(`SELECT post_id FROM community_reactions WHERE user_id = $1 AND post_id = ANY($2)`, [currentUserId, postIds]),
      pool.query(`SELECT post_id FROM community_saves WHERE user_id = $1 AND post_id = ANY($2)`, [currentUserId, postIds]),
    ]);
    const likedSet = new Set(likesRes.rows.map((r) => r.post_id));
    const savedSet = new Set(savesRes.rows.map((r) => r.post_id));

    rows.forEach((r) => {
      r.isLiked = likedSet.has(r.id);
      r.isSaved = savedSet.has(r.id);
    });
  }

  return {
    items: rows.map(formatPostRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + rows.length < total,
    },
  };
}

/**
 * Lấy chi tiết bài viết theo Slug
 */
export async function getPostBySlug(pool, slug, user = null) {
  const sql = `
    SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object('id', m.id, 'url', m.url, 'order', m."order", 'alt', m.alt)
        ) FILTER (WHERE m.id IS NOT NULL), '[]'::json
      ) as media
    FROM community_posts p
    LEFT JOIN community_post_media m ON p.id = m.post_id
    WHERE p.slug = $1
    GROUP BY p.id
  `;

  const { rows } = await pool.query(sql, [slug]);
  const post = rows[0];

  if (!post) {
    const err = new Error('Bài viết không tồn tại');
    err.status = 404;
    throw err;
  }

  // Kiểm tra quyền xem:
  // Nếu bài chưa published: Chỉ tác giả hoặc Admin mới được xem
  if (post.status !== 'published') {
    const isAuthor = user && user.id === post.author_id;
    const isAdmin = user && user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      const err = new Error('Bài viết không tồn tại hoặc chưa được công khai');
      err.status = 404;
      throw err;
    }
  }

  // Kiểm tra isLiked, isSaved
  if (user && user.id) {
    const [likeRes, saveRes] = await Promise.all([
      pool.query(`SELECT 1 FROM community_reactions WHERE user_id = $1 AND post_id = $2`, [user.id, post.id]),
      pool.query(`SELECT 1 FROM community_saves WHERE user_id = $1 AND post_id = $2`, [user.id, post.id]),
    ]);
    post.isLiked = likeRes.rows.length > 0;
    post.isSaved = saveRes.rows.length > 0;
  }

  return formatPostRow(post);
}

/**
 * Tăng lượt xem bài viết
 */
export async function incrementPostView(pool, postId) {
  await pool.query(`UPDATE community_posts SET views_count = views_count + 1 WHERE id = $1`, [postId]);
}

/**
 * Tạo bài viết mới (bài thường hoặc review có tour)
 */
export async function createPost(pool, postData, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập để thực hiện');
    err.status = 401;
    throw err;
  }

  // 1. Kiểm tra cờ chặn đăng bài
  const flagRes = await pool.query(`SELECT is_post_banned, note FROM community_user_flags WHERE user_id = $1`, [user.id]);
  if (flagRes.rows[0]?.is_post_banned) {
    const err = new Error(`Tài khoản của bạn đã bị khóa quyền đăng bài: ${flagRes.rows[0].note || 'Vi phạm tiêu chuẩn cộng đồng'}`);
    err.status = 403;
    throw err;
  }

  // 2. Rate limit (5 bài / 10 phút)
  const rl = rateLimiter.check('post', user.id, RATE_LIMITS.CREATE_POST.max, RATE_LIMITS.CREATE_POST.windowMs);
  if (!rl.allowed) {
    const err = new Error(`${RATE_LIMITS.CREATE_POST.message} Thử lại sau ${rl.retryAfterSec}s.`);
    err.status = 429;
    throw err;
  }

  // 3. Xử lý & sanitize HTML
  const contentHtml = sanitizeHtml(postData.contentHtml || postData.content_html || '');
  if (!contentHtml || contentHtml.trim().length < 10) {
    const err = new Error('Nội dung bài viết quá ngắn (tối thiểu 10 ký tự)');
    err.status = 400;
    throw err;
  }

  const title = (postData.title || '').trim();
  if (title.length < 5) {
    const err = new Error('Tiêu đề bài viết phải có ít nhất 5 ký tự');
    err.status = 400;
    throw err;
  }

  const excerpt = postData.excerpt?.trim() || extractExcerpt(contentHtml);
  let destination = (postData.destination || '').trim();
  const group = postData.group || 'family';
  const kind = postData.kind === 'review' ? 'review' : 'post';
  let tourId = postData.tourId || postData.tour_id || null;
  let bookingId = postData.bookingId || postData.booking_id || null;
  let rating = postData.rating ? Number(postData.rating) : null;

  if (!destination && (tourId || bookingId)) {
    try {
      const tId = tourId;
      if (tId) {
        const tr = await pool.query('SELECT destination FROM tours WHERE id = $1', [tId]);
        if (tr.rows[0]?.destination) destination = tr.rows[0].destination;
      }
    } catch {
      // ignore
    }
  }
  if (!destination) destination = 'Toàn quốc';

  // 4. Kiểm tra quy tắc nghiệp vụ cho Review
  if (kind === 'review') {
    if (!bookingId) {
      const err = new Error('Bài đánh giá (review) bắt buộc phải gắn mã đơn đặt tour đã hoàn thành');
      err.status = 400;
      throw err;
    }

    if (!rating || rating < 1 || rating > 5) {
      const err = new Error('Đánh giá tour bắt buộc phải chấm điểm từ 1 đến 5 sao');
      err.status = 400;
      throw err;
    }

    // Xác minh booking: phải thuộc về user và đã completed
    const bookingRes = await pool.query(
      `SELECT id, "tourId", "contactEmail", status FROM bookings WHERE id = $1`,
      [bookingId]
    );
    const booking = bookingRes.rows[0];

    if (!booking) {
      const err = new Error('Mã đơn tour không tồn tại trên hệ thống');
      err.status = 404;
      throw err;
    }

    if (booking.status !== 'completed') {
      const err = new Error('Chỉ được đánh giá chuyến đi đã hoàn thành (completed)');
      err.status = 400;
      throw err;
    }

    if (booking.contactEmail.toLowerCase() !== user.email.toLowerCase()) {
      const err = new Error('Đơn đặt tour này không thuộc về tài khoản của bạn');
      err.status = 403;
      throw err;
    }

    // Đảm bảo 1 booking chỉ gắn với 1 bài review còn hiệu lực
    const existingReview = await pool.query(
      `SELECT id FROM community_posts WHERE booking_id = $1 AND status != 'rejected'`,
      [bookingId]
    );
    if (existingReview.rows.length > 0) {
      const err = new Error('Chuyến đi này đã được bạn đánh giá trước đó');
      err.status = 409;
      throw err;
    }

    tourId = booking.tourId;
  } else {
    // Post thường: không gắn booking_id, không sao
    bookingId = null;
    rating = null;
    if (user.role !== 'admin') {
      tourId = null;
    }
  }

  // 5. Kiểm tra từ khóa cấm
  let hasProhibitedWord = false;
  const combinedText = `${title} ${contentHtml}`.toLowerCase();
  for (const word of COMMUNITY_CONFIG.PROHIBITED_KEYWORDS) {
    if (combinedText.includes(word.toLowerCase())) {
      hasProhibitedWord = true;
      break;
    }
  }

  // 6. Quyết định trạng thái bài viết
  let status = postData.status === 'draft' ? 'draft' : 'pending';
  let isOfficial = false;
  let isPinned = false;
  let publishedAt = null;
  let rejectReason = null;

  // Nếu là bài Admin đăng chính thức
  if (user.role === 'admin' && postData.isOfficial) {
    isOfficial = true;
    isPinned = Boolean(postData.isPinned);
    status = 'published';
    publishedAt = new Date().toISOString();
  } else if (hasProhibitedWord) {
    // Nếu chứa từ khóa cấm: vẫn gửi pending nhưng gắn cờ cảnh báo
    rejectReason = '[CẢNH BÁO TỰ ĐỘNG]: Chứa từ khóa nhạy cảm cần quản trị viên kiểm tra kỹ.';
  }

  const id = `post-${randomUUID()}`;
  const slug = generateSlug(title);
  const now = new Date().toISOString();
  const hashtags = Array.isArray(postData.hashtags) ? JSON.stringify(postData.hashtags) : JSON.stringify([]);
  const coverImage = postData.coverImage || postData.cover_image || null;

  const authorName = isOfficial ? 'GoReady' : (user.name || 'Người dùng');
  const authorAvatar = isOfficial ? null : (user.avatar || null);

  await pool.query(
    `INSERT INTO community_posts (
      id, author_id, author_name, author_avatar, author_email, slug, kind, title, content_html, excerpt,
      cover_image, "group", destination, hashtags, tour_id, booking_id, rating, is_official, is_pinned,
      status, reject_reason, published_at, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [
      id,
      user.id,
      authorName,
      authorAvatar,
      user.email,
      slug,
      kind,
      title,
      contentHtml,
      excerpt,
      coverImage,
      group,
      destination,
      hashtags,
      tourId,
      bookingId,
      rating,
      isOfficial,
      isPinned,
      status,
      rejectReason,
      publishedAt,
      now,
      now,
    ]
  );

  // Lưu media nếu có
  const mediaList = Array.isArray(postData.media) ? postData.media : [];
  for (let i = 0; i < Math.min(mediaList.length, COMMUNITY_CONFIG.UPLOAD.MAX_IMAGES_PER_POST); i++) {
    const m = mediaList[i];
    if (m && m.url) {
      await pool.query(
        `INSERT INTO community_post_media (id, post_id, url, "order", alt) VALUES ($1, $2, $3, $4, $5)`,
        [`media-${randomUUID()}`, id, m.url, i + 1, m.alt || title]
      );
    }
  }

  return await getPostBySlug(pool, slug, user);
}

/**
 * Cập nhật bài viết (chính chủ hoặc admin)
 * Nếu bài đang published -> chuyển về pending
 */
export async function updatePost(pool, postId, updateData, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const { rows } = await pool.query(`SELECT * FROM community_posts WHERE id = $1`, [postId]);
  const post = rows[0];
  if (!post) {
    const err = new Error('Bài viết không tồn tại');
    err.status = 404;
    throw err;
  }

  const isAuthor = post.author_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    const err = new Error('Bạn không có quyền sửa bài viết của người khác');
    err.status = 403;
    throw err;
  }

  const title = updateData.title ? updateData.title.trim() : post.title;
  let contentHtml = post.content_html;
  if (updateData.contentHtml || updateData.content_html) {
    contentHtml = sanitizeHtml(updateData.contentHtml || updateData.content_html);
  }
  const excerpt = updateData.excerpt?.trim() || extractExcerpt(contentHtml);
  const destination = updateData.destination ? updateData.destination.trim() : post.destination;
  const group = updateData.group || post.group;
  const coverImage = updateData.coverImage !== undefined ? updateData.coverImage : post.cover_image;
  const hashtags = Array.isArray(updateData.hashtags) ? JSON.stringify(updateData.hashtags) : JSON.stringify(post.hashtags || []);

  // Luồng trạng thái: Nếu người dùng sửa bài đã published -> quay lại pending để duyệt lại
  let status = post.status;
  let publishedAt = post.published_at;

  if (!isAdmin && post.status === 'published') {
    status = 'pending';
    publishedAt = null;
  } else if (!isAdmin && updateData.submitForReview) {
    status = 'pending';
  }

  // Admin có thể ghim hoặc cập nhật trực tiếp
  let isPinned = post.is_pinned;
  if (isAdmin && updateData.isPinned !== undefined) {
    isPinned = Boolean(updateData.isPinned);
  }

  const now = new Date().toISOString();

  await pool.query(
    `UPDATE community_posts
     SET title = $1, content_html = $2, excerpt = $3, destination = $4, "group" = $5,
         cover_image = $6, hashtags = $7, status = $8, published_at = $9, is_pinned = $10, updated_at = $11
     WHERE id = $12`,
    [title, contentHtml, excerpt, destination, group, coverImage, hashtags, status, publishedAt, isPinned, now, postId]
  );

  return await getPostBySlug(pool, post.slug, user);
}

/**
 * Xóa mềm bài viết (chính chủ hoặc admin)
 */
export async function deletePost(pool, postId, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const { rows } = await pool.query(`SELECT * FROM community_posts WHERE id = $1`, [postId]);
  const post = rows[0];
  if (!post) {
    const err = new Error('Bài viết không tồn tại');
    err.status = 404;
    throw err;
  }

  const isAuthor = post.author_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isAuthor && !isAdmin) {
    const err = new Error('Bạn không có quyền xóa bài viết này');
    err.status = 403;
    throw err;
  }

  // Thực hiện xóa bài (cascade xóa media, comments, reactions, saves)
  await pool.query(`DELETE FROM community_posts WHERE id = $1`, [postId]);
  return { success: true, message: 'Đã xóa bài viết thành công' };
}

// ============================================================================
// KIỂM DUYỆT (ADMIN ONLY)
// ============================================================================

/**
 * Lấy danh sách bài viết cho Admin kiểm duyệt
 */
export async function listPostsForModeration(pool, status = 'pending', page = 1, limit = 20, adminUser) {
  assertAdmin(adminUser);

  const conditions = [];
  const values = [];

  if (status && status !== 'all') {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = Math.max(0, (page - 1) * limit);

  values.push(limit);
  const limitIdx = values.length;
  values.push(offset);
  const offsetIdx = values.length;

  const sql = `
    SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object('id', m.id, 'url', m.url, 'order', m."order", 'alt', m.alt)
        ) FILTER (WHERE m.id IS NOT NULL), '[]'::json
      ) as media
    FROM community_posts p
    LEFT JOIN community_post_media m ON p.id = m.post_id
    ${whereClause}
    GROUP BY p.id
    ORDER BY (CASE WHEN p.status = 'pending' THEN p.created_at END) ASC NULLS LAST, p.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await pool.query(sql, values);

  const countSql = `SELECT count(*)::int as total FROM community_posts ${whereClause}`;
  const countResult = await pool.query(countSql, values.slice(0, -2));
  const total = countResult.rows[0]?.total ?? 0;

  return {
    items: rows.map(formatPostRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Kiểm duyệt một bài viết (publish | reject | hide | unhide | pin | unpin)
 */
export async function moderatePost(pool, postId, { action, reason = '' }, adminUser) {
  assertAdmin(adminUser);

  const { rows } = await pool.query(`SELECT * FROM community_posts WHERE id = $1`, [postId]);
  const post = rows[0];
  if (!post) {
    const err = new Error('Bài viết không tồn tại');
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  let newStatus = post.status;
  let publishedAt = post.published_at;
  let isPinned = post.is_pinned;
  let rejectReason = post.reject_reason;

  switch (action) {
    case 'publish':
    case 'approve':
      newStatus = 'published';
      publishedAt = publishedAt || now;
      rejectReason = null;
      break;

    case 'reject':
      if (!reason || reason.trim().length === 0) {
        const err = new Error('Bắt buộc phải nhập lý do khi từ chối bài viết');
        err.status = 400;
        throw err;
      }
      newStatus = 'rejected';
      rejectReason = reason.trim();
      break;

    case 'hide':
      newStatus = 'hidden';
      break;

    case 'unhide':
      newStatus = 'published';
      break;

    case 'pin':
      isPinned = true;
      break;

    case 'unpin':
      isPinned = false;
      break;

    default: {
      const err = new Error(`Hành động không hợp lệ: ${action}`);
      err.status = 400;
      throw err;
    }
  }

  await pool.query(
    `UPDATE community_posts
     SET status = $1, published_at = $2, is_pinned = $3, reject_reason = $4,
         reviewed_by = $5, reviewed_at = $6, updated_at = $6
     WHERE id = $7`,
    [newStatus, publishedAt, isPinned, rejectReason, adminUser.email, now, postId]
  );

  // Ghi nhật ký kiểm duyệt
  await logModeration(pool, adminUser.id || adminUser.email, action, 'post', postId, reason);

  return { success: true, postId, status: newStatus, isPinned };
}

/**
 * Duyệt hàng loạt bài viết
 */
export async function bulkPublishPosts(pool, postIds, adminUser) {
  assertAdmin(adminUser);
  if (!Array.isArray(postIds) || postIds.length === 0) {
    const err = new Error('Danh sách bài viết cần duyệt không được rỗng');
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  await pool.query(
    `UPDATE community_posts
     SET status = 'published', published_at = COALESCE(published_at, $1),
         reviewed_by = $2, reviewed_at = $1, updated_at = $1
     WHERE id = ANY($3)`,
    [now, adminUser.email, postIds]
  );

  for (const pid of postIds) {
    await logModeration(pool, adminUser.id || adminUser.email, 'bulk_publish', 'post', pid, 'Duyệt hàng loạt');
  }

  return { success: true, count: postIds.length };
}

/**
 * Chặn hoặc bỏ chặn người dùng đăng bài
 */
export async function setUserPostBan(pool, { userId, isBanned, note = '' }, adminUser) {
  assertAdmin(adminUser);
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO community_user_flags (user_id, is_post_banned, note, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
     SET is_post_banned = EXCLUDED.is_post_banned,
         note = EXCLUDED.note,
         created_by = EXCLUDED.created_by,
         created_at = EXCLUDED.created_at`,
    [userId, Boolean(isBanned), note, adminUser.email, now]
  );

  await logModeration(
    pool,
    adminUser.id || adminUser.email,
    isBanned ? 'ban_user' : 'unban_user',
    'user',
    userId,
    note
  );

  return { success: true, userId, isPostBanned: isBanned };
}

/**
 * Ghi nhật ký kiểm duyệt vào community_moderation_log
 */
export async function logModeration(pool, adminId, action, targetType, targetId, reason = '') {
  const id = `modlog-${randomUUID()}`;
  await pool.query(
    `INSERT INTO community_moderation_log (id, admin_id, action, target_type, target_id, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, adminId, action, targetType, targetId, reason, new Date().toISOString()]
  );
}

// ============================================================================
// TƯƠNG TÁC (REACTIONS, SAVES, COMMENTS, REPORTS)
// ============================================================================

/**
 * Toggle thích (Like / Unlike)
 */
export async function toggleReaction(pool, postId, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const rl = rateLimiter.check('reaction', user.id, RATE_LIMITS.REACTION.max, RATE_LIMITS.REACTION.windowMs);
  if (!rl.allowed) {
    const err = new Error(RATE_LIMITS.REACTION.message);
    err.status = 429;
    throw err;
  }

  const existing = await pool.query(
    `SELECT id FROM community_reactions WHERE user_id = $1 AND post_id = $2 AND type = 'like'`,
    [user.id, postId]
  );

  let isLiked = false;
  if (existing.rows.length > 0) {
    // Bỏ like
    await pool.query(`DELETE FROM community_reactions WHERE id = $1`, [existing.rows[0].id]);
    await pool.query(`UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1`, [postId]);
    isLiked = false;
  } else {
    // Thêm like
    const id = `react-${randomUUID()}`;
    await pool.query(
      `INSERT INTO community_reactions (id, user_id, post_id, type, created_at) VALUES ($1, $2, $3, 'like', NOW())`,
      [id, user.id, postId]
    );
    await pool.query(`UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1`, [postId]);
    isLiked = true;
  }

  const postRes = await pool.query(`SELECT likes_count FROM community_posts WHERE id = $1`, [postId]);
  return { isLiked, likesCount: postRes.rows[0]?.likes_count ?? 0 };
}

/**
 * Toggle lưu bài viết (Save / Unsave)
 */
export async function toggleSave(pool, postId, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const existing = await pool.query(
    `SELECT id FROM community_saves WHERE user_id = $1 AND post_id = $2`,
    [user.id, postId]
  );

  let isSaved = false;
  if (existing.rows.length > 0) {
    await pool.query(`DELETE FROM community_saves WHERE id = $1`, [existing.rows[0].id]);
    isSaved = false;
  } else {
    await pool.query(
      `INSERT INTO community_saves (id, user_id, post_id, created_at) VALUES ($1, $2, $3, NOW())`,
      [`save-${randomUUID()}`, user.id, postId]
    );
    isSaved = true;
  }

  return { isSaved };
}

/**
 * Tạo bình luận 2 cấp (tối đa 2 cấp)
 */
export async function createComment(pool, { postId, parentId = null, content }, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập để bình luận');
    err.status = 401;
    throw err;
  }

  const rl = rateLimiter.check('comment', user.id, RATE_LIMITS.CREATE_COMMENT.max, RATE_LIMITS.CREATE_COMMENT.windowMs);
  if (!rl.allowed) {
    const err = new Error(RATE_LIMITS.CREATE_COMMENT.message);
    err.status = 429;
    throw err;
  }

  const cleanContent = (content || '').trim();
  if (cleanContent.length === 0 || cleanContent.length > COMMUNITY_CONFIG.COMMENTS.MAX_LENGTH) {
    const err = new Error(`Nội dung bình luận phải từ 1 đến ${COMMUNITY_CONFIG.COMMENTS.MAX_LENGTH} ký tự`);
    err.status = 400;
    throw err;
  }

  // Nếu có parentId: kiểm tra bình luận cha
  if (parentId) {
    const parentRes = await pool.query(`SELECT id, parent_id, post_id FROM community_comments WHERE id = $1`, [parentId]);
    const parentComment = parentRes.rows[0];
    if (!parentComment) {
      const err = new Error('Bình luận cha không tồn tại');
      err.status = 404;
      throw err;
    }
    if (parentComment.post_id !== postId) {
      const err = new Error('Bình luận cha không thuộc về bài viết này');
      err.status = 400;
      throw err;
    }
    // Giới hạn tối đa 2 cấp: comment cha không được có parent_id
    if (parentComment.parent_id !== null) {
      const err = new Error('Chỉ hỗ trợ tối đa 2 cấp bình luận');
      err.status = 400;
      throw err;
    }
  }

  const id = `cmt-${randomUUID()}`;
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO community_comments (id, post_id, user_id, user_name, user_avatar, parent_id, content, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'visible', $8)`,
    [id, postId, user.id, user.name || 'Người dùng', user.avatar || null, parentId || null, cleanContent, now]
  );

  // Tăng comments_count trong bài viết
  await pool.query(`UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1`, [postId]);

  return {
    id,
    postId,
    userId: user.id,
    userName: user.name || 'Người dùng',
    userAvatar: user.avatar || null,
    parentId: parentId || null,
    content: cleanContent,
    status: 'visible',
    createdAt: now,
  };
}

/**
 * Xóa bình luận (chính chủ hoặc admin)
 */
export async function deleteComment(pool, commentId, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const { rows } = await pool.query(`SELECT * FROM community_comments WHERE id = $1`, [commentId]);
  const comment = rows[0];
  if (!comment) {
    const err = new Error('Bình luận không tồn tại');
    err.status = 404;
    throw err;
  }

  const isOwner = comment.user_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    const err = new Error('Bạn không có quyền xóa bình luận này');
    err.status = 403;
    throw err;
  }

  // Đếm số lượng bình luận bị xóa (bao gồm cả reply con nếu có)
  const childRes = await pool.query(`SELECT count(*)::int as count FROM community_comments WHERE id = $1 OR parent_id = $1`, [commentId]);
  const deleteCount = childRes.rows[0]?.count ?? 1;

  await pool.query(`DELETE FROM community_comments WHERE id = $1 OR parent_id = $1`, [commentId]);

  // Giảm comments_count
  await pool.query(`UPDATE community_posts SET comments_count = GREATEST(0, comments_count - $1) WHERE id = $2`, [deleteCount, comment.post_id]);

  if (isAdmin) {
    await logModeration(pool, adminUser.id || adminUser.email, 'delete_comment', 'comment', commentId, 'Admin xóa bình luận');
  }

  return { success: true };
}

/**
 * Lấy danh sách bình luận của bài viết (lồng cấp 2 vào replies)
 */
export async function listComments(pool, postId, { page = 1, limit = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM community_comments
     WHERE post_id = $1 AND status = 'visible'
     ORDER BY created_at ASC`,
    [postId]
  );

  // Nhóm bình luận cấp 1 và lồng cấp 2
  const topLevel = [];
  const replyMap = new Map();

  for (const c of rows) {
    if (!c.parent_id) {
      c.replies = [];
      topLevel.push(c);
      replyMap.set(c.id, c.replies);
    } else {
      if (replyMap.has(c.parent_id)) {
        replyMap.get(c.parent_id).push(c);
      }
    }
  }

  const offset = (page - 1) * limit;
  const paginated = topLevel.slice(offset, offset + limit);

  return {
    items: paginated,
    total: topLevel.length,
    page,
    limit,
  };
}

/**
 * Báo cáo vi phạm (bài viết hoặc bình luận)
 */
export async function createReport(pool, { targetType, targetId, reason }, user) {
  if (!user || !user.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }

  const rl = rateLimiter.check('report', user.id, RATE_LIMITS.REPORT.max, RATE_LIMITS.REPORT.windowMs);
  if (!rl.allowed) {
    const err = new Error(RATE_LIMITS.REPORT.message);
    err.status = 429;
    throw err;
  }

  const cleanReason = (reason || '').trim();
  if (!cleanReason) {
    const err = new Error('Vui lòng cung cấp lý do báo cáo');
    err.status = 400;
    throw err;
  }

  // Kiểm tra: Mỗi user chỉ báo cáo 1 lần cho cùng 1 đối tượng
  const existing = await pool.query(
    `SELECT id FROM community_reports WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3`,
    [user.id, targetType, targetId]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Bạn đã gửi báo cáo cho nội dung này trước đó');
    err.status = 409;
    throw err;
  }

  const id = `rep-${randomUUID()}`;
  await pool.query(
    `INSERT INTO community_reports (id, reporter_id, reporter_name, target_type, target_id, reason, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW())`,
    [id, user.id, user.name || 'Người dùng', targetType, targetId, cleanReason]
  );

  return { success: true, message: 'Đã gửi báo cáo vi phạm thành công' };
}

/**
 * Danh sách báo cáo vi phạm cho Admin
 */
export async function listReports(pool, status = 'open', adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền xem danh sách báo cáo');
    err.status = 403;
    throw err;
  }

  let query = `
    SELECT * FROM community_reports
  `;
  const params = [];
  if (status && status !== 'all') {
    query += ` WHERE status = $1`;
    params.push(status);
  }
  query += ` ORDER BY created_at DESC LIMIT 100`;

  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    status: r.status,
    handledBy: r.handled_by,
    createdAt: r.created_at,
  }));
}

/**
 * Xử lý báo cáo vi phạm (Admin): status = 'resolved' | 'dismissed'
 */
export async function handleReport(pool, reportId, { status, note = '' }, adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền xử lý báo cáo');
    err.status = 403;
    throw err;
  }

  if (!['resolved', 'dismissed'].includes(status)) {
    const err = new Error('Trạng thái xử lý không hợp lệ');
    err.status = 400;
    throw err;
  }

  const res = await pool.query(
    `UPDATE community_reports
     SET status = $1, handled_by = $2
     WHERE id = $3 RETURNING *`,
    [status, adminUser.id || adminUser.email, reportId]
  );

  if (res.rows.length === 0) {
    const err = new Error('Không tìm thấy báo cáo vi phạm');
    err.status = 404;
    throw err;
  }

  await logModeration(pool, adminUser.id || adminUser.email, `report_${status}`, 'report', reportId, note);
  return { success: true, report: res.rows[0] };
}

/**
 * Danh sách bài viết của chính người dùng (mọi trạng thái: draft, pending, published, rejected, hidden)
 */
export async function listMyPosts(pool, user) {
  if (!user || (!user.id && !user.email)) {
    const err = new Error('Vui lòng đăng nhập để xem bài viết của bạn');
    err.status = 401;
    throw err;
  }

  const sql = `
    SELECT p.*,
      COALESCE(
        json_agg(
          json_build_object('id', m.id, 'url', m.url, 'order', m."order", 'alt', m.alt)
        ) FILTER (WHERE m.id IS NOT NULL), '[]'::json
      ) as media
    FROM community_posts p
    LEFT JOIN community_post_media m ON p.id = m.post_id
    WHERE (p.author_id = $1 OR ($2 != '' AND LOWER(p.author_email) = LOWER($2)))
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  const { rows } = await pool.query(sql, [user.id || '', user.email || '']);
  return rows.map(formatPostRow);
}

/**
 * Danh sách các booking hoàn thành của user chưa được gắn bài review nào
 */
export async function getEligibleBookings(pool, user) {
  if (!user || !user.email) {
    return [];
  }

  const sql = `
    SELECT b.id, b."bookingCode", b."tourId", b."departureDate", b."contactName", b."contactEmail", b."totalPrice", b.status,
           t.name as "tourName", t."coverImage" as "tourCoverImage", t.destination as "tourDestination"
    FROM bookings b
    LEFT JOIN tours t ON (b."tourId" = t.id OR b."tourId" = t.code)
    WHERE LOWER(b."contactEmail") = LOWER($1)
      AND b.status = 'completed'
      AND b.id NOT IN (
        SELECT booking_id FROM community_posts WHERE booking_id IS NOT NULL AND status != 'rejected'
      )
    ORDER BY b."createdAt" DESC
  `;

  const { rows } = await pool.query(sql, [user.email]);
  return rows.map(r => ({
    id: r.id,
    bookingCode: r.bookingCode || r.id,
    tourId: r.tourId,
    tourName: r.tourName || 'Tour GoReady',
    tourCoverImage: r.tourCoverImage,
    tourDestination: r.tourDestination || '',
    departureDate: r.departureDate,
    totalPrice: r.totalPrice,
  }));
}

/**
 * Thống kê tổng quan cộng đồng (Admin)
 */
export async function getAdminStats(pool, adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền xem thống kê');
    err.status = 403;
    throw err;
  }

  const [pendingRes, reportsRes, todayRes, weekRes, kindRes] = await Promise.all([
    pool.query(`SELECT count(*)::int as count FROM community_posts WHERE status = 'pending'`),
    pool.query(`SELECT count(*)::int as count FROM community_reports WHERE status = 'open'`),
    pool.query(`SELECT count(*)::int as count FROM community_posts WHERE created_at::timestamptz >= CURRENT_DATE`),
    pool.query(`SELECT count(*)::int as count FROM community_posts WHERE created_at::timestamptz >= NOW() - INTERVAL '7 days'`),
    pool.query(`SELECT kind, is_official, count(*)::int as count FROM community_posts GROUP BY kind, is_official`),
  ]);

  const kinds = { review: 0, post: 0, official: 0 };
  kindRes.rows.forEach(r => {
    if (r.is_official) kinds.official += r.count;
    else if (r.kind === 'review') kinds.review += r.count;
    else kinds.post += r.count;
  });

  return {
    pendingCount: pendingRes.rows[0]?.count || 0,
    openReportsCount: reportsRes.rows[0]?.count || 0,
    todayPostsCount: todayRes.rows[0]?.count || 0,
    weekPostsCount: weekRes.rows[0]?.count || 0,
    postsByKind: kinds,
  };
}

/**
 * Danh sách bình luận mới nhất cho Admin
 */
export async function listAdminComments(pool, adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT c.*, p.title as "postTitle", p.slug as "postSlug"
    FROM community_comments c
    LEFT JOIN community_posts p ON c.post_id = p.id
    ORDER BY c.created_at DESC
    LIMIT 100
  `;
  const res = await pool.query(sql);
  return res.rows.map(r => ({
    id: r.id,
    postId: r.post_id,
    postTitle: r.postTitle || 'Bài viết',
    postSlug: r.postSlug,
    userId: r.user_id,
    userName: r.user_name,
    userAvatar: r.user_avatar,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/**
 * Danh sách tác giả đăng bài kèm trạng thái cờ chặn (Admin)
 */
export async function listAdminUsers(pool, adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT
      p.author_id as "userId",
      p.author_name as "userName",
      p.author_email as "userEmail",
      count(*)::int as "totalPosts",
      count(*) FILTER (WHERE p.status = 'published')::int as "publishedPosts",
      count(*) FILTER (WHERE p.status = 'rejected')::int as "rejectedPosts",
      COALESCE(f.is_post_banned, false) as "isPostBanned",
      f.note as "banNote",
      f.created_at as "bannedAt"
    FROM community_posts p
    LEFT JOIN community_user_flags f ON p.author_id = f.user_id
    GROUP BY p.author_id, p.author_name, p.author_email, f.is_post_banned, f.note, f.created_at
    ORDER BY "totalPosts" DESC
    LIMIT 100
  `;
  const res = await pool.query(sql);
  return res.rows;
}

/**
 * Nhật ký kiểm duyệt Admin
 */
export async function listAdminLogs(pool, adminUser) {
  if (!adminUser || adminUser.role !== 'admin') {
    const err = new Error('Chỉ Quản trị viên mới có quyền');
    err.status = 403;
    throw err;
  }

  const sql = `
    SELECT * FROM community_moderation_log
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const res = await pool.query(sql);
  return res.rows.map(r => ({
    id: r.id,
    adminId: r.admin_id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}



