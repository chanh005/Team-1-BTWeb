import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { toggleArticleHidden } from '../../../lib/articles.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const article = await toggleArticleHidden(pool, req.query.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  return res.status(200).json(article);
}
