import { sanitizeHtml, extractExcerpt } from './community/sanitize.js';

// Bài viết cẩm nang / thông báo do Admin đăng. Hiển thị trên Feed (showOnFeed) và có trang chi tiết theo slug.
// Nội dung HTML được sanitize ở server trước khi lưu (cùng bộ lọc với bài Cộng đồng).

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'];
export const ARTICLE_LIMITS = {
  TITLE: 255,
  SLUG: 255,
  SUMMARY: 500,
  CATEGORY: 100,
  TAG: 30,
  TAGS: 10,
  META_TITLE: 255,
  META_DESCRIPTION: 320,
  COVER: 2048,
};

// Tên cột trong bảng `articles` (cột camelCase phải bọc nháy kép)
const COLUMN = {
  title: 'title',
  slug: 'slug',
  summary: 'summary',
  content: 'content',
  coverImage: '"coverImage"',
  category: 'category',
  tags: 'tags',
  status: 'status',
  showOnFeed: '"showOnFeed"',
  isPinned: '"isPinned"',
  metaTitle: '"metaTitle"',
  metaDescription: '"metaDescription"',
};

// Danh sách công khai không cần `content` (nội dung dài, chỉ tải khi mở bài)
const LIST_COLUMNS = `id, title, slug, summary, "coverImage", category, tags, status, "showOnFeed", "isPinned",
  "metaTitle", "metaDescription", "authorName", "viewsCount", "createdAt", "updatedAt"`;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

/** Tạo slug không dấu, chữ thường, ngăn cách bằng "-" (dùng cho URL và SEO). */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

function readText(input, key, { max, required = false, label }) {
  if (input[key] === undefined) return undefined;
  const value = input[key] === null ? '' : String(input[key]).trim();
  if (required && !value) throw fail(`${label} không được để trống`);
  if (value.length > max) throw fail(`${label} tối đa ${max} ký tự`);
  return value;
}

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const out = [];
  for (const raw of list) {
    const tag = String(raw).trim().replace(/^#/, '').slice(0, ARTICLE_LIMITS.TAG);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  if (out.length > ARTICLE_LIMITS.TAGS) throw fail(`Tối đa ${ARTICLE_LIMITS.TAGS} thẻ`);
  return out;
}

/**
 * Kiểm tra và chuẩn hoá dữ liệu đầu vào. partial = true khi cập nhật (chỉ kiểm tra trường được gửi lên).
 * Không xử lý `slug` ở đây vì cần truy vấn DB (xem createArticle / updateArticle).
 */
export function normalizeInput(input = {}, { partial = false } = {}) {
  const out = {};

  const title = readText(input, 'title', { max: ARTICLE_LIMITS.TITLE, required: !partial, label: 'Tiêu đề' });
  if (title !== undefined) {
    if (title.length < 5) throw fail('Tiêu đề phải có ít nhất 5 ký tự');
    out.title = title;
  }

  if (input.content !== undefined || !partial) {
    const html = sanitizeHtml(String(input.content ?? ''));
    if (html.replace(/<[^>]*>/g, '').trim().length < 10) throw fail('Nội dung bài viết quá ngắn (tối thiểu 10 ký tự)');
    out.content = html;
  }

  const summary = readText(input, 'summary', { max: ARTICLE_LIMITS.SUMMARY, label: 'Tóm tắt' });
  if (summary !== undefined) out.summary = summary;
  // Không nhập tóm tắt thì lấy đoạn đầu của nội dung
  if (out.content !== undefined && (summary === '' || (summary === undefined && !partial))) {
    out.summary = extractExcerpt(out.content, 180);
  }

  const category = readText(input, 'category', { max: ARTICLE_LIMITS.CATEGORY, label: 'Chuyên mục' });
  if (category !== undefined) out.category = category || null;

  if (input.coverImage !== undefined) {
    const cover = input.coverImage === null ? '' : String(input.coverImage).trim();
    if (cover && cover.length > ARTICLE_LIMITS.COVER) throw fail('Đường dẫn ảnh quá dài');
    if (cover && !/^(\/|https?:\/\/)/.test(cover)) throw fail('Ảnh đại diện phải là đường dẫn hoặc URL');
    out.coverImage = cover || null;
  }

  if (input.tags !== undefined) out.tags = cleanTags(input.tags);

  if (input.status !== undefined) {
    if (!ARTICLE_STATUSES.includes(input.status)) throw fail(`Trạng thái phải là một trong: ${ARTICLE_STATUSES.join(', ')}`);
    out.status = input.status;
  }

  for (const key of ['showOnFeed', 'isPinned']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') throw fail(`${key} phải là true/false`);
    out[key] = input[key];
  }

  const metaTitle = readText(input, 'metaTitle', { max: ARTICLE_LIMITS.META_TITLE, label: 'Meta title' });
  if (metaTitle !== undefined) out.metaTitle = metaTitle || null;
  const metaDescription = readText(input, 'metaDescription', { max: ARTICLE_LIMITS.META_DESCRIPTION, label: 'Meta description' });
  if (metaDescription !== undefined) out.metaDescription = metaDescription || null;

  return out;
}

/** Trả về slug chưa dùng. Slug tự sinh thì thêm "-2", "-3"...; slug admin nhập tay thì báo lỗi. */
async function reserveSlug(pool, base, { exceptId = null, manual = false }) {
  let candidate = base;
  for (let n = 2; ; n += 1) {
    const { rows } = await pool.query('SELECT 1 FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)', [candidate, exceptId]);
    if (rows.length === 0) return candidate;
    if (manual) throw fail('Slug này đã được dùng cho bài viết khác', 409);
    candidate = `${base}-${n}`;
  }
}

/** Admin: lấy user từ DB theo id/email gửi kèm header; chỉ role admin và chưa bị khoá mới được ghi. */
export async function resolveAdmin(pool, { id, email }) {
  if (!id && !email) return null;
  const { rows } = id
    ? await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [id])
    : await pool.query('SELECT id, name, email, role, status FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  const user = rows[0];
  if (!user || user.role !== 'admin' || user.status === 'locked') return null;
  if (email && user.email.toLowerCase() !== String(email).toLowerCase()) return null;
  return user;
}

/**
 * Danh sách bài viết. publicOnly = true: chỉ bài published, không kèm nội dung.
 * Bài ghim (isPinned) lên đầu, sau đó theo ngày tạo mới nhất.
 */
export async function getArticles(pool, {
  page = 1,
  limit = 10,
  status,
  showOnFeed,
  category,
  search,
  publicOnly = false,
} = {}) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (publicOnly) where.push(`status = 'published'`);
  else if (status) add('status = ?', status);
  if (showOnFeed !== undefined) add(`"showOnFeed" = ?`, Boolean(showOnFeed));
  if (category) add('category = ?', category);
  if (search) {
    params.push(`%${search}%`);
    where.push(`(title ILIKE $${params.length} OR summary ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const columns = publicOnly ? LIST_COLUMNS : '*';

  const [{ rows: items }, { rows: count }] = await Promise.all([
    pool.query(
      `SELECT ${columns} FROM articles ${whereSql}
       ORDER BY "isPinned" DESC, "createdAt" DESC
       LIMIT ${safeLimit} OFFSET ${(safePage - 1) * safeLimit}`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS n FROM articles ${whereSql}`, params),
  ]);

  return { items, total: count[0].n, page: safePage, limit: safeLimit };
}

/** Bài công khai theo slug. Mỗi lần mở bài tăng viewsCount. Bài nháp/lưu trữ trả về null. */
export async function getArticleBySlug(pool, slug) {
  const { rows } = await pool.query(
    `UPDATE articles SET "viewsCount" = "viewsCount" + 1
     WHERE slug = $1 AND status = 'published'
     RETURNING *`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function createArticle(pool, input) {
  const data = normalizeInput(input);
  if (!data.title) throw fail('Tiêu đề không được để trống');

  const manualSlug = typeof input.slug === 'string' && input.slug.trim() !== '';
  const base = slugify(manualSlug ? input.slug : data.title) || 'bai-viet';
  data.slug = await reserveSlug(pool, base, { manual: manualSlug });

  const keys = Object.keys(data);
  const { rows } = await pool.query(
    `INSERT INTO articles (${keys.map((k) => COLUMN[k]).join(', ')})
     VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    keys.map((k) => (k === 'tags' ? JSON.stringify(data[k]) : data[k]))
  );
  return rows[0];
}

export async function updateArticle(pool, id, input) {
  const data = normalizeInput(input, { partial: true });

  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (!slug) throw fail('Slug không hợp lệ');
    data.slug = await reserveSlug(pool, slug, { exceptId: id, manual: true });
  }

  const keys = Object.keys(data);
  if (keys.length === 0) throw fail('Không có trường nào để cập nhật');

  const sets = keys.map((k, i) => `${COLUMN[k]} = $${i + 1}`);
  const { rows } = await pool.query(
    `UPDATE articles SET ${sets.join(', ')}, "updatedAt" = NOW()
     WHERE id = $${keys.length + 1}
     RETURNING *`,
    [...keys.map((k) => (k === 'tags' ? JSON.stringify(data[k]) : data[k])), id]
  );
  if (!rows[0]) throw fail('Không tìm thấy bài viết', 404);
  return rows[0];
}

export async function deleteArticle(pool, id) {
  const { rowCount } = await pool.query('DELETE FROM articles WHERE id = $1', [id]);
  if (!rowCount) throw fail('Không tìm thấy bài viết', 404);
  return { success: true, id };
}
