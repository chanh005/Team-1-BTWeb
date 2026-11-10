import { getPool } from '../db.js';

export const COMMUNITY_CREATE_SQL = `
  -- 1. Bảng bài viết / đánh giá cộng đồng
  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_email TEXT,
    slug TEXT UNIQUE NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('review', 'post')),
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    cover_image TEXT,
    "group" TEXT NOT NULL CHECK ("group" IN ('family', 'backpack', 'deal', 'student')),
    destination TEXT NOT NULL,
    hashtags JSONB DEFAULT '[]'::jsonb,
    tour_id TEXT,
    booking_id TEXT,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    is_official BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'hidden')),
    reject_reason TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0
  );

  -- Index duy nhất: mỗi booking_id chỉ được liên kết với tối đa 1 bài review hợp lệ (không tính bài đã xóa hoặc null)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_community_posts_booking_unique 
    ON community_posts (booking_id) 
    WHERE booking_id IS NOT NULL AND status != 'rejected';

  -- 2. Bảng hình ảnh / media đính kèm bài viết
  CREATE TABLE IF NOT EXISTS community_post_media (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    alt TEXT DEFAULT ''
  );

  -- 3. Bảng bình luận (hỗ trợ tối đa 2 cấp qua parent_id)
  CREATE TABLE IF NOT EXISTS community_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    parent_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    created_at TEXT NOT NULL
  );

  -- 4. Bảng lượt thích / reaction (unique user + post + type)
  CREATE TABLE IF NOT EXISTS community_reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'like',
    created_at TEXT NOT NULL,
    CONSTRAINT community_reactions_user_post_type_key UNIQUE (user_id, post_id, type)
  );

  -- 5. Bảng bài viết đã lưu (bookmark)
  CREATE TABLE IF NOT EXISTS community_saves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    CONSTRAINT community_saves_user_post_key UNIQUE (user_id, post_id)
  );

  -- 6. Bảng báo cáo vi phạm
  CREATE TABLE IF NOT EXISTS community_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    reporter_name TEXT,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    handled_by TEXT,
    created_at TEXT NOT NULL
  );

  -- 7. Bảng cờ vi phạm / chặn user đăng bài cộng đồng (tách riêng, không thêm cột vào bảng users cũ)
  CREATE TABLE IF NOT EXISTS community_user_flags (
    user_id TEXT PRIMARY KEY,
    is_post_banned BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL
  );

  -- 8. Bảng nhật ký kiểm duyệt của Admin
  CREATE TABLE IF NOT EXISTS community_moderation_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
  );

  -- Các chỉ mục tối ưu truy vấn (Indexes)
  CREATE INDEX IF NOT EXISTS idx_community_posts_status_published ON community_posts (status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_community_posts_pinned_published ON community_posts (is_pinned, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_community_posts_group_dest ON community_posts ("group", destination);
  CREATE INDEX IF NOT EXISTS idx_community_posts_kind ON community_posts (kind);
  CREATE INDEX IF NOT EXISTS idx_community_posts_slug ON community_posts (slug);
  CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts (author_id);
  CREATE INDEX IF NOT EXISTS idx_community_posts_tour ON community_posts (tour_id);
  CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments (post_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_reactions (post_id);
  CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports (status, created_at DESC);
`;

export const COMMUNITY_DROP_SQL = `
  DROP TABLE IF EXISTS community_moderation_log CASCADE;
  DROP TABLE IF EXISTS community_user_flags CASCADE;
  DROP TABLE IF EXISTS community_reports CASCADE;
  DROP TABLE IF EXISTS community_saves CASCADE;
  DROP TABLE IF EXISTS community_reactions CASCADE;
  DROP TABLE IF EXISTS community_comments CASCADE;
  DROP TABLE IF EXISTS community_post_media CASCADE;
  DROP TABLE IF EXISTS community_posts CASCADE;
`;

let ensured = false;

export async function ensureCommunitySchema(pool) {
  if (ensured) return;
  await pool.query(COMMUNITY_CREATE_SQL);
  ensured = true;
  console.log('[Community DB] Đã khởi tạo schema các bảng community_* thành công.');
}

export async function rollbackCommunitySchema(pool) {
  await pool.query(COMMUNITY_DROP_SQL);
  ensured = false;
  console.log('[Community DB] Đã rollback toàn bộ các bảng community_*.');
}

// Chạy trực tiếp qua node: node GoReady/lib/community/schema.js
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lib/community/schema.js')) {
  const pool = getPool();
  const isRollback = process.argv.includes('--rollback');
  if (isRollback) {
    await rollbackCommunitySchema(pool);
  } else {
    await ensureCommunitySchema(pool);
  }
  await pool.end();
}

