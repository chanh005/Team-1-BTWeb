import { randomUUID } from 'node:crypto';

// Every writable column of `articles`; anything else in a request body (e.g. unknown keys, `views`, the rating
// aggregates) is ignored — `views` only changes through incrementArticleViews so a stale admin save can't reset it
const COLUMNS = [
  'id', 'slug', 'title', 'category', 'coverImage', 'excerpt', 'content', 'author', 'hidden', 'createdAt',
  'status', 'publishAt', 'pinned', 'relatedTourIds',
];
const JSON_COLUMNS = ['relatedTourIds'];
const STATUSES = ['draft', 'published'];
const MAX_COMMENT_LENGTH = 1000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Invalid/empty dates become null; valid ones are stored as UTC ISO strings so they compare correctly as TEXT
function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Article row + rating/comment aggregates (hidden comments aren't counted)
const SELECT_ARTICLES = `
  SELECT a.*,
    COALESCE(r.avg, 0) AS "ratingAvg",
    COALESCE(r.cnt, 0) AS "ratingCount",
    COALESCE(c.cnt, 0) AS "commentCount"
  FROM articles a
  LEFT JOIN (SELECT "articleId", AVG(rating)::float AS avg, COUNT(*)::int AS cnt FROM article_ratings GROUP BY "articleId") r
    ON r."articleId" = a.id
  LEFT JOIN (SELECT "articleId", COUNT(*)::int AS cnt FROM article_comments WHERE NOT hidden GROUP BY "articleId") c
    ON c."articleId" = a.id
`;

/**
 * `publicOnly`: only what readers of Bảng tin may see — not hidden, not a draft, and past its scheduled time.
 * Pinned articles come first, then newest by publish date.
 */
export async function listArticles(pool, { publicOnly = false } = {}) {
  const where = publicOnly
    ? `WHERE NOT a.hidden AND a.status = 'published' AND (a."publishAt" IS NULL OR a."publishAt" <= $1)`
    : '';
  const params = publicOnly ? [new Date().toISOString()] : [];
  const { rows } = await pool.query(
    `${SELECT_ARTICLES} ${where} ORDER BY a.pinned DESC, COALESCE(a."publishAt", a."createdAt") DESC`,
    params
  );
  return rows;
}

async function getArticle(pool, id) {
  const { rows } = await pool.query(`${SELECT_ARTICLES} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
}

function normalize(row) {
  return {
    ...row,
    status: STATUSES.includes(row.status) ? row.status : 'published',
    publishAt: toIsoOrNull(row.publishAt),
    pinned: Boolean(row.pinned),
    relatedTourIds: Array.isArray(row.relatedTourIds) ? row.relatedTourIds.map(String) : [],
  };
}

export async function createArticle(pool, body) {
  const id = body.id || `article-${randomUUID()}`;
  const createdAt = body.createdAt ?? new Date().toISOString();
  const row = normalize({
    id,
    slug: body.slug || id,
    title: body.title ?? '',
    category: body.category ?? 'Tin tức',
    coverImage: body.coverImage ?? '',
    excerpt: body.excerpt ?? '',
    content: body.content ?? '',
    author: body.author ?? '',
    hidden: body.hidden ?? false,
    createdAt,
    status: body.status ?? 'published',
    publishAt: body.publishAt ?? createdAt,
    pinned: body.pinned ?? false,
    relatedTourIds: body.relatedTourIds ?? [],
  });

  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => (JSON_COLUMNS.includes(c) ? JSON.stringify(row[c]) : row[c]));
  await pool.query(`INSERT INTO articles (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);

  return getArticle(pool, id);
}

export async function updateArticle(pool, id, patch) {
  const { rows: existing } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  if (!existing[0]) return null;

  const merged = normalize({ ...existing[0], ...patch, id });
  const cols = Object.keys(merged).filter((c) => c !== 'id' && COLUMNS.includes(c));
  const setClause = cols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const values = cols.map((c) => (JSON_COLUMNS.includes(c) ? JSON.stringify(merged[c]) : merged[c]));
  await pool.query(`UPDATE articles SET ${setClause} WHERE id = $1`, [id, ...values]);

  return getArticle(pool, id);
}

export async function toggleArticleHidden(pool, id) {
  const { rows: existing } = await pool.query('SELECT hidden FROM articles WHERE id = $1', [id]);
  if (!existing[0]) return null;
  await pool.query('UPDATE articles SET hidden = $1 WHERE id = $2', [!existing[0].hidden, id]);
  return getArticle(pool, id);
}

export async function deleteArticle(pool, id) {
  await pool.query('DELETE FROM article_comments WHERE "articleId" = $1', [id]);
  await pool.query('DELETE FROM article_ratings WHERE "articleId" = $1', [id]);
  await pool.query('DELETE FROM articles WHERE id = $1', [id]);
}

/** Called by Bảng tin each time a reader opens an article. Returns the new count, or null if there's no such article. */
export async function incrementArticleViews(pool, id) {
  const { rows } = await pool.query('UPDATE articles SET views = views + 1 WHERE id = $1 RETURNING views', [id]);
  return rows[0]?.views ?? null;
}

// --- Bình luận & đánh giá ---

// Only active accounts may comment/rate; throws 404/403 otherwise
async function requireActiveUser(pool, userId) {
  if (!userId) throw httpError(400, 'userId is required');
  const { rows } = await pool.query('SELECT id, status FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw httpError(404, 'User not found');
  if (rows[0].status === 'locked') throw httpError(403, 'locked');
}

async function requireArticle(pool, articleId) {
  const { rows } = await pool.query('SELECT id FROM articles WHERE id = $1', [articleId]);
  if (!rows[0]) throw httpError(404, 'Article not found');
}

// A comment with its author's name and the rating that author gave the article (null if none)
const SELECT_COMMENTS = `
  SELECT c.*, u.name AS "userName", r.rating AS "userRating", a.title AS "articleTitle"
  FROM article_comments c
  LEFT JOIN users u ON u.id = c."userId"
  LEFT JOIN article_ratings r ON r."articleId" = c."articleId" AND r."userId" = c."userId"
  LEFT JOIN articles a ON a.id = c."articleId"
`;

async function ratingSummary(pool, articleId, userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(AVG(rating)::float, 0) AS "ratingAvg", COUNT(*)::int AS "ratingCount",
            MAX(CASE WHEN "userId" = $2 THEN rating END) AS "myRating"
     FROM article_ratings WHERE "articleId" = $1`,
    [articleId, userId ?? '']
  );
  return rows[0];
}

/** What a reader sees under an article: visible comments (newest first) + rating summary (+ their own rating). */
export async function getArticleFeedback(pool, articleId, userId) {
  await requireArticle(pool, articleId);
  const { rows: comments } = await pool.query(
    `${SELECT_COMMENTS} WHERE c."articleId" = $1 AND NOT c.hidden ORDER BY c."createdAt" DESC`,
    [articleId]
  );
  return { comments, ...(await ratingSummary(pool, articleId, userId)) };
}

export async function addComment(pool, articleId, userId, content) {
  const text = String(content ?? '').trim();
  if (!text) throw httpError(400, 'Nội dung bình luận không được để trống');
  if (text.length > MAX_COMMENT_LENGTH) throw httpError(400, `Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự`);
  await requireArticle(pool, articleId);
  await requireActiveUser(pool, userId);

  const id = `cmt-${randomUUID()}`;
  await pool.query(
    'INSERT INTO article_comments (id, "articleId", "userId", content, hidden, "createdAt") VALUES ($1,$2,$3,$4,FALSE,$5)',
    [id, articleId, userId, text, new Date().toISOString()]
  );
  const { rows } = await pool.query(`${SELECT_COMMENTS} WHERE c.id = $1`, [id]);
  return rows[0];
}

/** Sets (or changes) the user's 1–5 star rating of an article; returns the new rating summary. */
export async function rateArticle(pool, articleId, userId, rating) {
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw httpError(400, 'Điểm đánh giá phải từ 1 đến 5');
  await requireArticle(pool, articleId);
  await requireActiveUser(pool, userId);

  await pool.query(
    `INSERT INTO article_ratings ("articleId", "userId", rating, "createdAt") VALUES ($1,$2,$3,$4)
     ON CONFLICT ("articleId", "userId") DO UPDATE SET rating = EXCLUDED.rating, "createdAt" = EXCLUDED."createdAt"`,
    [articleId, userId, value, new Date().toISOString()]
  );
  return ratingSummary(pool, articleId, userId);
}

/** Admin: every comment of every article, hidden ones included, newest first. */
export async function listAllComments(pool) {
  const { rows } = await pool.query(`${SELECT_COMMENTS} ORDER BY c."createdAt" DESC`);
  return rows;
}

export async function setCommentHidden(pool, id, hidden) {
  const { rows } = await pool.query('UPDATE article_comments SET hidden = $1 WHERE id = $2 RETURNING id', [Boolean(hidden), id]);
  if (!rows[0]) return null;
  const { rows: full } = await pool.query(`${SELECT_COMMENTS} WHERE c.id = $1`, [id]);
  return full[0];
}

export async function deleteComment(pool, id) {
  await pool.query('DELETE FROM article_comments WHERE id = $1', [id]);
}
