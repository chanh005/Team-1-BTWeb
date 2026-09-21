import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listChuyenDi } from '../../../lib/chuyenDi.js';

const router = Router();
const pool = getPool();

// GET /api/chuyen-di?email=... — the trips ("Chuyến đi của tôi") of paid orders placed with that contact e-mail
router.get('/', async (req, res, next) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    if (!email.trim()) return res.status(400).json({ error: 'Thiếu email' });
    res.json(await listChuyenDi(pool, email));
  } catch (err) {
    next(err);
  }
});

export default router;
