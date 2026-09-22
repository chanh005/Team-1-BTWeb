import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { rateArticle } from '../../../lib/articles.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const { userId, rating } = req.body || {};
  try {
    return res.status(200).json(await rateArticle(pool, req.query.id, userId, rating));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}
