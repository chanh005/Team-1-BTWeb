import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, rowToBooking, bookingToRow } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
  res.json(rows.map(rowToBooking));
});

router.post('/', (req, res) => {
  const booking = { ...req.body, id: req.body.id || `booking-${randomUUID()}` };
  const row = bookingToRow(booking);
  const cols = Object.keys(row);
  db.prepare(`INSERT INTO bookings (${cols.join(',')}) VALUES (${cols.map((c) => `@${c}`).join(',')})`).run(row);

  // Keep the account's totalBookings count in sync, if the contact email matches a registered user.
  db.prepare('UPDATE users SET totalBookings = totalBookings + 1 WHERE lower(email) = lower(?)').run(booking.contactEmail);

  res.status(201).json(rowToBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id)));
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Booking not found' });
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(rowToBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id)));
});

export default router;
