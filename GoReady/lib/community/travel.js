import { randomUUID } from 'node:crypto';
import { PROVINCES, GOPOINT, PROFILE } from './config.js';
import { computeBadges, nextBadgeHint } from './badges.js';
import { normalizeProvince } from './provinces.js';

// Mọi số liệu ở đây được ĐẾM từ bảng gốc mỗi lần gọi (không có bộ đếm riêng).
// Chỉ bài status = 'published' mới tính vào đánh giá / tỉnh đã đi / chuyến xác thực / hữu ích / GoPoint.

const AUTHOR_SQL = `(p.author_id = $1 OR ($2 <> '' AND LOWER(p.author_email) = LOWER($2)))`;

export async function getTravelSummary(pool, user) {
  if (!user?.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }
  const email = user.email || '';

  const [userRes, profileRes, postsRes, helpfulRes, ledgerRes, recentRes] = await Promise.all([
    pool.query(`SELECT id, name, avatar, "joinedAt" FROM users WHERE id = $1`, [user.id]),
    pool.query(`SELECT bio, is_public FROM community_profiles WHERE user_id = $1`, [user.id]),
    pool.query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.kind, p.rating, p.tour_id, p.booking_id, p.destination, p.published_at,
              t.name AS tour_name, t.destination AS tour_destination
       FROM community_posts p
       LEFT JOIN LATERAL (
         SELECT name, destination FROM tours WHERE id = p.tour_id OR code = p.tour_id LIMIT 1
       ) t ON TRUE
       WHERE ${AUTHOR_SQL} AND p.status = 'published'
       ORDER BY p.published_at DESC`,
      [user.id, email]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n
       FROM community_reactions r JOIN community_posts p ON p.id = r.post_id
       WHERE ${AUTHOR_SQL} AND p.status = 'published' AND r.type = 'like' AND r.user_id <> $1`,
      [user.id, email]
    ),
    pool.query(
      `SELECT id, delta, reason, created_at FROM gopoint_ledger WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    ),
    pool.query(
      `SELECT p.id, p.slug, p.title, p.status, p.kind, p.booking_id, p.created_at, p.published_at, p.reject_reason
       FROM community_posts p
       WHERE ${AUTHOR_SQL} AND p.status <> 'draft'
       ORDER BY p.created_at DESC LIMIT 10`,
      [user.id, email]
    ),
  ]);

  const u = userRes.rows[0] || {};
  const published = postsRes.rows;

  const reviewRows = published.filter((r) => r.kind === 'review' && r.booking_id);
  const provinces = new Set();
  for (const r of reviewRows) {
    const p = normalizeProvince(r.tour_destination || r.destination);
    if (p) provinces.add(p);
  }
  const visitedProvinces = PROVINCES.filter((p) => provinces.has(p));

  const stats = {
    postsCount: published.length,
    provincesCount: visitedProvinces.length,
    verifiedTripsCount: new Set(reviewRows.map((r) => r.booking_id)).size,
  };
  const badges = computeBadges(stats);

  return {
    displayName: u.name || user.name || 'Người dùng',
    avatar: u.avatar || null,
    joinedAt: u.joinedAt || null,
    bio: profileRes.rows[0]?.bio || '',
    isPublic: profileRes.rows[0]?.is_public ?? true,
    postsCount: stats.postsCount,
    reviewsCount: reviewRows.length,
    verifiedTripsCount: stats.verifiedTripsCount,
    helpfulCount: helpfulRes.rows[0].n,
    gopointBalance: ledgerRes.rows.reduce((sum, r) => sum + r.delta, 0),
    gopointHistory: ledgerRes.rows.slice(0, 20).map((r) => ({ id: r.id, delta: r.delta, reason: r.reason, createdAt: r.created_at })),
    allProvinces: PROVINCES,
    visitedProvinces,
    badges,
    nextBadgeHint: nextBadgeHint(badges),
    recentPosts: recentRes.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      isVerified: Boolean(r.kind === 'review' && r.booking_id),
      createdAt: r.created_at,
      publishedAt: r.published_at,
      rejectReason: r.reject_reason,
    })),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      tourId: r.tour_id,
      tourName: r.tour_name || 'Tour GoReady',
      rating: r.rating,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      publishedAt: r.published_at,
    })),
  };
}

export async function updateMyProfile(pool, user, { bio, isPublic }) {
  if (!user?.id) {
    const err = new Error('Vui lòng đăng nhập');
    err.status = 401;
    throw err;
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > PROFILE.BIO_MAX_LENGTH)) {
    const err = new Error(`Bio tối đa ${PROFILE.BIO_MAX_LENGTH} ký tự`);
    err.status = 400;
    throw err;
  }
  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    const err = new Error('isPublic phải là true/false');
    err.status = 400;
    throw err;
  }
  // Chỉ ghi đè trường được gửi lên (COALESCE giữ giá trị cũ)
  const { rows } = await pool.query(
    `INSERT INTO community_profiles (user_id, bio, is_public, updated_at)
     VALUES ($1, COALESCE($2, ''), COALESCE($3, TRUE), $4)
     ON CONFLICT (user_id) DO UPDATE SET
       bio = COALESCE($2, community_profiles.bio),
       is_public = COALESCE($3, community_profiles.is_public),
       updated_at = $4
     RETURNING bio, is_public`,
    [user.id, bio === undefined ? null : bio.trim(), isPublic === undefined ? null : isPublic, new Date().toISOString()]
  );
  return { bio: rows[0].bio, isPublic: rows[0].is_public };
}

/**
 * Cộng GoPoint khi bài review gắn booking được duyệt. Chạy lại bao nhiêu lần cũng chỉ cộng 1 lần
 * (UNIQUE booking_id + ON CONFLICT DO NOTHING). Hủy duyệt sau đó KHÔNG trừ điểm.
 */
export async function awardGoPointForPost(pool, post) {
  if (!post || post.kind !== 'review' || !post.booking_id || !post.author_id) return false;
  const { rowCount } = await pool.query(
    `INSERT INTO gopoint_ledger (id, user_id, booking_id, delta, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (booking_id) DO NOTHING`,
    [
      `gp-${randomUUID()}`,
      post.author_id,
      post.booking_id,
      GOPOINT.REVIEW_APPROVED,
      `Bài "${post.title}" được duyệt`,
      new Date().toISOString(),
    ]
  );
  return rowCount > 0;
}
