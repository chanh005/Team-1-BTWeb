import express from 'express';
import { dbConfigured, ensureSchema, pool } from './db';
import { seedTours } from './seedTours';

const PORT = Number(process.env.PORT) || 4000;
const app = express();

// Every /api/suggested-tours* route needs the database; without DATABASE_URL the front end falls back to Sheets/CSV
const requireDb: express.RequestHandler = (_req, res, next) => {
  if (dbConfigured) return next();
  res.status(503).json({ error: 'Chưa cấu hình POSTGRES_URL (GoReady/.env)' });
};

app.get('/api/health', async (_req, res) => {
  if (!dbConfigured) return res.json({ ok: true, db: 'not-configured' });
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/suggested-tours', requireDb, async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT data FROM suggested_tours ORDER BY position');
    res.json(rows.map((r) => r.data));
  } catch (err) {
    next(err);
  }
});

app.get('/api/suggested-tours/:id', requireDb, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT data FROM suggested_tours WHERE upper(code) = upper($1)', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy tour' });
    res.json(rows[0].data);
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}`));

// Prepare the database in the background so the API is up immediately even if Neon is waking from idle
if (dbConfigured) {
  (async () => {
    await ensureSchema();
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM suggested_tours');
    if (rows[0].n === 0) await seedTours();
    else console.log(`[db] Đã kết nối Neon, bảng suggested_tours có ${rows[0].n} tour`);
  })().catch((err) => console.error('[db] Không khởi tạo được database:', err instanceof Error ? err.message : err));
} else {
  console.warn('[db] Chưa có POSTGRES_URL — API tour tắt, front end dùng Google Sheets/CSV. Điền GoReady/.env để bật Neon.');
}
