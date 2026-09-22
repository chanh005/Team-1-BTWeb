import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listTours, createTour, updateTour, toggleTourHidden, deleteTour } from '../../../lib/tours.js';

const router = Router();
const pool = getPool();

// Express 4 does not catch rejected promises from async handlers: without this a failing query
// (e.g. a duplicate id while importing from the Google Sheet) would crash the whole server.
const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

router.get('/', wrap(async (_req, res) => {
  res.json(await listTours(pool));
}));

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await createTour(pool, req.body));
}));

router.put('/:id', wrap(async (req, res) => {
  const tour = await updateTour(pool, req.params.id, req.body);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json(tour);
}));

router.patch('/:id/hidden', wrap(async (req, res) => {
  const tour = await toggleTourHidden(pool, req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json(tour);
}));

router.delete('/:id', wrap(async (req, res) => {
  await deleteTour(pool, req.params.id);
  res.status(204).end();
}));

export default router;
