import express from 'express';
import cors from 'cors';
import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import toursRouter from './routes/tours.js';
import bookingsRouter from './routes/bookings.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' })); // allow base64 avatar uploads

app.use('/api/tours', toursRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const pool = getPool();
await ensureSchema(pool);
await seedIfEmpty(pool);

app.listen(PORT, () => {
  console.log(`GoReady backend (local dev, Postgres) listening on http://localhost:${PORT}`);
});
