import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import { loginOrRegister } from '../../lib/users.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

  const pool = getPool();
  await ensureSchema(pool);
  await seedIfEmpty(pool);

  try {
    const user = await loginOrRegister(pool, name, email);
    return res.status(200).json(user);
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'locked' });
    throw err;
  }
}
