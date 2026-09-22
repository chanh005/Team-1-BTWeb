import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { getArticleFeedback, addComment } from '../../../lib/articles.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);
  const { id, userId } = req.query;

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await getArticleFeedback(pool, id, userId));
    }
    if (req.method === 'POST') {
      const { userId: author, content } = req.body || {};
      return res.status(201).json(await addComment(pool, id, author, content));
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
