import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { incrementArticleViews } from '../../../lib/articles.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const views = await incrementArticleViews(pool, req.query.id);
  if (views === null) return res.status(404).json({ error: 'Article not found' });
  return res.status(200).json({ views });
}
