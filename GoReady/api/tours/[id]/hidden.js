import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { toggleTourHidden } from '../../../lib/tours.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const tour = await toggleTourHidden(pool, req.query.id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  return res.status(200).json(tour);
}
