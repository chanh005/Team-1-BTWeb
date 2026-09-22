import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { listArticles, createArticle } from '../../lib/articles.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);

  if (req.method === 'GET') {
    return res.status(200).json(await listArticles(pool));
  }
  if (req.method === 'POST') {
    return res.status(201).json(await createArticle(pool, req.body));
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
