import pg from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL is not set. Add it to GoReady/.env for local dev, or to the Vercel project env vars.');
    }
    pool = new pg.Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}
