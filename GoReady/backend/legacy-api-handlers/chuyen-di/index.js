import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import { listChuyenDi } from '../../lib/chuyenDi.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  if (!email.trim()) return res.status(400).json({ error: 'Thiếu email' });

  const pool = getPool();
  await ensureSchema(pool);
  await seedIfEmpty(pool);
  return res.status(200).json(await listChuyenDi(pool, email));
}
