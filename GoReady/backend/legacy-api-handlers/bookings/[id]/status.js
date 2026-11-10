import { getPool } from '../../../lib/db.js';
import { ensureSchema } from '../../../lib/schema.js';
import { updateBookingStatus } from '../../../lib/bookings.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const booking = await updateBookingStatus(pool, req.query.id, req.body?.status);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  return res.status(200).json(booking);
}
