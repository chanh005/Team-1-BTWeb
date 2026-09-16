import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY joinedAt DESC').all());
});

// Demo auth: no password, just name + email. Creates the account on first login.
router.post('/login', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

  const existing = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
  if (existing) {
    if (existing.status === 'locked') return res.status(403).json({ error: 'locked' });
    return res.json(existing);
  }

  const user = {
    id: `usr-${randomUUID()}`,
    name,
    email,
    phone: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    totalBookings: 0,
    status: 'active',
  };
  db.prepare('INSERT INTO users (id, name, email, phone, joinedAt, totalBookings, status) VALUES (@id, @name, @email, @phone, @joinedAt, @totalBookings, @status)').run(user);
  res.status(201).json(user);
});

router.patch('/:id/status', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const status = existing.status === 'active' ? 'locked' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id));
});

export default router;
