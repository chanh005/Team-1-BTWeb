import express from 'express';
import cors from 'cors';
import { getPool } from '../../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../../lib/schema.js';
import toursRouter from './routes/tours.js';
import bookingsRouter from './routes/bookings.js';
import usersRouter from './routes/users.js';
import imagesRouter from './routes/images.js';

const app = express();
const PORT = process.env.PORT || 4000;
const pool = getPool();

app.use(cors());

// Before the global JSON parser below: uploads carry a photo (base64), so this route sets its own, larger body limit
app.use('/api/images', imagesRouter(pool));

app.use(express.json({ limit: '2mb' })); // allow base64 avatar uploads

app.use('/api/tours', toursRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

await ensureSchema(pool);
await seedIfEmpty(pool);

app.listen(PORT, () => {
  console.log(`GoReady backend (local dev, Postgres) listening on http://localhost:${PORT}`);
});
