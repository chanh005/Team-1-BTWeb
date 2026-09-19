import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, ensureSchema } from './db';
// Same parser the front end uses, so the sheet columns are understood identically in both places
import { parseSuggestedTours, toCsvUrl } from '../../GoReady/src/services/suggestedTours';

const LOCAL_CSV = fileURLToPath(new URL('../../GoReady/public/data/suggested-tours.csv', import.meta.url));

const readSource = async (): Promise<{ label: string; csv: string }> => {
  const remote = process.env.SUGGESTED_TOURS_URL?.trim();
  if (remote) {
    try {
      const res = await fetch(toCsvUrl(remote));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { label: 'Google Sheets', csv: await res.text() };
    } catch (err) {
      console.warn('[seed] Không đọc được Google Sheets, dùng CSV mẫu:', err instanceof Error ? err.message : err);
    }
  }
  return { label: LOCAL_CSV, csv: await readFile(LOCAL_CSV, 'utf8') };
};

/** Replaces the contents of `tours` with what the sheet (or bundled CSV) currently holds. */
export const seedTours = async (): Promise<number> => {
  const { label, csv } = await readSource();
  const tours = parseSuggestedTours(csv);
  if (tours.length === 0) throw new Error(`Không có tour hợp lệ trong nguồn dữ liệu: ${label}`);

  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [position, tour] of tours.entries()) {
      await client.query(
        `INSERT INTO suggested_tours (code, destination, position, data, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (code) DO UPDATE
           SET destination = EXCLUDED.destination, position = EXCLUDED.position,
               data = EXCLUDED.data, updated_at = now()`,
        [tour.id, tour.destination, position, JSON.stringify(tour)],
      );
    }
    // The sheet is the source of truth: drop tours that were removed from it
    await client.query('DELETE FROM suggested_tours WHERE code <> ALL($1::text[])', [tours.map((t) => t.id)]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[seed] Đã nạp ${tours.length} tour từ ${label}`);
  return tours.length;
};
