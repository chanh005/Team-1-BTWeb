import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { listAllComments } from '../../lib/articles.js';

// Admin: every comment of Bảng tin, for moderation
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  return res.status(200).json(await listAllComments(pool));
}
