import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listBookings, createBooking, updateBookingStatus } from '../../../lib/bookings.js';

const router = Router();
const pool = getPool();

// Express 4 không bắt lỗi của handler async: không có wrap thì một lỗi (vd. 409 hết chỗ) làm treo/sập server
const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

router.get('/', wrap(async (_req, res) => {
  res.json(await listBookings(pool));
}));

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await createBooking(pool, req.body));
}));

router.patch('/:id/status', wrap(async (req, res) => {
  const booking = await updateBookingStatus(pool, req.params.id, req.body.status);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
}));

export default router;
