import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { updateArticle, deleteArticle } from '../../lib/articles.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);
  const { id } = req.query;

  if (req.method === 'PUT') {
    const article = await updateArticle(pool, id, req.body);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    return res.status(200).json(article);
  }
  if (req.method === 'DELETE') {
    await deleteArticle(pool, id);
    return res.status(204).end();
  }
  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
