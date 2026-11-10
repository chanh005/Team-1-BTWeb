import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import { loginOrRegister } from '../../lib/users.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body || {};

  // If no name, use email as name
  const displayName = name || email.split('@')[0];
  
  if (!email) return res.status(400).json({ error: 'email is required' });

  const pool = getPool();

  await ensureSchema(pool);
  await seedIfEmpty(pool);

  try {
    const user = await loginOrRegister(pool, displayName, email);
    return res.status(200).json(user);
  } catch (err) {
    console.error('Login error:', err);
    if (err.status === 403) return res.status(403).json({ error: 'locked' });
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
