import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { updateTour, deleteTour } from '../../lib/tours.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);
  const { id } = req.query;

  if (req.method === 'PUT') {
    const tour = await updateTour(pool, id, req.body);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    return res.status(200).json(tour);
  }
  if (req.method === 'DELETE') {
    await deleteTour(pool, id);
    return res.status(204).end();
  }
  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
