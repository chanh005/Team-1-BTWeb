import { randomUUID } from 'node:crypto';

// Every writable column of `articles`; anything else in a request body (e.g. unknown keys) is ignored
const COLUMNS = ['id', 'slug', 'title', 'category', 'coverImage', 'excerpt', 'content', 'author', 'hidden', 'createdAt'];

export async function listArticles(pool) {
  const { rows } = await pool.query('SELECT * FROM articles ORDER BY "createdAt" DESC');
  return rows;
}

export async function createArticle(pool, body) {
  const id = body.id || `article-${randomUUID()}`;
  const row = {
    id,
    slug: body.slug || id,
    title: body.title ?? '',
    category: body.category ?? 'Tin tức',
    coverImage: body.coverImage ?? '',
    excerpt: body.excerpt ?? '',
    content: body.content ?? '',
    author: body.author ?? '',
    hidden: body.hidden ?? false,
    createdAt: body.createdAt ?? new Date().toISOString(),
  };

  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => row[c]);
  await pool.query(`INSERT INTO articles (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);

  const { rows } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return rows[0];
}

export async function updateArticle(pool, id, patch) {
  const { rows: existing } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  if (!existing[0]) return null;

  const merged = { ...existing[0], ...patch, id };
  const cols = Object.keys(merged).filter((c) => c !== 'id' && COLUMNS.includes(c));
  const setClause = cols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const values = cols.map((c) => merged[c]);
  await pool.query(`UPDATE articles SET ${setClause} WHERE id = $1`, [id, ...values]);

  const { rows } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return rows[0];
}

export async function toggleArticleHidden(pool, id) {
  const { rows: existing } = await pool.query('SELECT hidden FROM articles WHERE id = $1', [id]);
  if (!existing[0]) return null;
  await pool.query('UPDATE articles SET hidden = $1 WHERE id = $2', [!existing[0].hidden, id]);
  const { rows } = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return rows[0];
}

export async function deleteArticle(pool, id) {
  await pool.query('DELETE FROM articles WHERE id = $1', [id]);
}
