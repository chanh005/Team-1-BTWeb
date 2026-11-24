import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listTours, createTour, updateTour, toggleTourHidden, deleteTour } from '../../../lib/tours.js';
import { requireUser } from '../../../lib/seller.js';

const router = Router();
const pool = getPool();

// Express 4 does not catch rejected promises from async handlers: without this a failing query
// (e.g. a duplicate id while importing from the Google Sheet) would crash the whole server.
const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

// Thêm / sửa / ẩn / xóa tour chỉ dành cho Admin: token lấy lúc đăng nhập trang Admin (xem src/api.ts).
// Đọc danh sách tour vẫn công khai (trang người mua dùng).
const adminOnly = (req, _res, next) => {
  requireUser(pool, req.headers.authorization, 'admin').then(() => next(), next);
};

router.get('/', wrap(async (req, res) => {
  res.json(await listTours(pool, { publicOnly: req.query.public === '1' }));
}));

router.post('/', adminOnly, wrap(async (req, res) => {
  res.status(201).json(await createTour(pool, req.body));
}));

router.put('/:id', adminOnly, wrap(async (req, res) => {
  const tour = await updateTour(pool, req.params.id, req.body);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json(tour);
}));

router.patch('/:id/hidden', adminOnly, wrap(async (req, res) => {
  const tour = await toggleTourHidden(pool, req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json(tour);
}));

router.delete('/:id', adminOnly, wrap(async (req, res) => {
  await deleteTour(pool, req.params.id);
  res.status(204).end();
}));

export default router;
