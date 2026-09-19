import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

// The connection string lives in GoReady/.env (next to the front end's package.json); backend/.env also works.
// dotenv keeps the first value it finds and never overrides variables already set in the environment.
dotenv.config({
  path: [fileURLToPath(new URL('../.env', import.meta.url)), fileURLToPath(new URL('../../GoReady/.env', import.meta.url))],
  quiet: true,
});

const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.trim();

export const dbConfigured = Boolean(connectionString);

// Neon closes idle connections and scales to zero, so keep the pool small and let it drop idle clients
export const pool = new pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

// An idle client erroring (e.g. Neon suspending the compute) must not crash the process
pool.on('error', (err) => console.warn('[db] idle client error:', err.message));

export const ensureSchema = () =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS suggested_tours (
      code        TEXT PRIMARY KEY,
      destination TEXT NOT NULL,
      position    INTEGER NOT NULL,
      data        JSONB NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
