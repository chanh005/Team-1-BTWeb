import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import { listBookings, createBooking } from '../../lib/bookings.js';

export default async function handler(req, res) {
  const pool = getPool();
  await ensureSchema(pool);
  await seedIfEmpty(pool);

  if (req.method === 'GET') {
    return res.status(200).json(await listBookings(pool));
  }
  if (req.method === 'POST') {
    return res.status(201).json(await createBooking(pool, req.body));
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
