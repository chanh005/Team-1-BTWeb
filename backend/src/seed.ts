import { dbConfigured, pool } from './db';
import { seedTours } from './seedTours';

if (!dbConfigured) {
  console.error('Chưa có chuỗi kết nối (POSTGRES_URL trong GoReady/.env hoặc DATABASE_URL trong backend/.env).');
  process.exit(1);
}

try {
  await seedTours();
} catch (err) {
  console.error('[seed] Thất bại:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
