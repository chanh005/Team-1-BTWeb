import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, rowToTour, tourToRow } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tours').all();
  res.json(rows.map(rowToTour));
});

router.post('/', (req, res) => {
  const tour = { ...req.body, id: req.body.id || `tour-${randomUUID()}`, slug: req.body.slug || `tour-${randomUUID()}` };
  const row = tourToRow(tour);
  const cols = Object.keys(row);
  db.prepare(`INSERT INTO tours (${cols.join(',')}) VALUES (${cols.map((c) => `@${c}`).join(',')})`).run(row);
  res.status(201).json(rowToTour(db.prepare('SELECT * FROM tours WHERE id = ?').get(tour.id)));
});

router.put('/:id', (req, res) => {
  const existingRow = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!existingRow) return res.status(404).json({ error: 'Tour not found' });
  const merged = { ...rowToTour(existingRow), ...req.body, id: req.params.id };
  const row = tourToRow(merged);
  const cols = Object.keys(row).filter((c) => c !== 'id');
  db.prepare(`UPDATE tours SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`).run(row);
  res.json(rowToTour(db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id)));
});

router.patch('/:id/hidden', (req, res) => {
  const existingRow = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id);
  if (!existingRow) return res.status(404).json({ error: 'Tour not found' });
  db.prepare('UPDATE tours SET hidden = ? WHERE id = ?').run(existingRow.hidden ? 0 : 1, req.params.id);
  res.json(rowToTour(db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
