import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { setCommentHidden, deleteComment } from '../../lib/articles.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const comment = await setCommentHidden(pool, id, req.body?.hidden);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    return res.status(200).json(comment);
  }
  if (req.method === 'DELETE') {
    await deleteComment(pool, id);
    return res.status(204).end();
  }
  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
