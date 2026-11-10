import express from 'express';
import cors from 'cors';
import { getPool } from '../lib/db.js';
import { ensureSchema, seedIfEmpty } from '../lib/schema.js';
import toursRouter from '../backend/src/routes/tours.js';
import bookingsRouter from '../backend/src/routes/bookings.js';
import usersRouter from '../backend/src/routes/users.js';
import imagesRouter from '../backend/src/routes/images.js';
import chuyenDiRouter from '../backend/src/routes/chuyenDi.js';
import communityRouter from '../backend/src/routes/community.js';

const app = express();
const pool = getPool();

// Lazy DB schema ensure & seed once per serverless instance cold start
let initPromise = null;
async function ensureDbReady() {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureSchema(pool);
      await seedIfEmpty(pool);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

app.use(cors());

// Ensure database schema is ready before handling requests
app.use(async (_req, _res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    next(err);
  }
});

// Create API router with all routes
const apiRouter = express.Router();

// Images route: sets its own limit (5mb) for base64 photo uploads, mounted before global express.json()
apiRouter.use('/images', imagesRouter(pool));

// JSON parser (2mb limit) for all other API endpoints
apiRouter.use(express.json({ limit: '2mb' }));

// Mount sub-routers
apiRouter.use('/tours', toursRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/chuyen-di', chuyenDiRouter);
apiRouter.use('/community', communityRouter);

// Health check endpoint
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

// Mount on both '/api' and '/' so routes match whether the prefix is preserved or stripped by Vercel rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 301 Redirect for legacy news routes
app.get('/news', (_req, res) => res.redirect(301, '/#/cong-dong'));
app.get('/news/*', (req, res) => res.redirect(301, `/#/cong-dong/${req.params[0] || ''}`));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[api error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: err instanceof Error ? err.message : 'Server error' });
});

export default app;

