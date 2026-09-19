import { api } from '../api';
import { fetchSheetTours } from '../services/suggestedTours';
import type { Tour } from '../types';

export interface SheetSyncResult {
  created: number;
  failed: { code: string; message: string }[];
}

// Requests in flight at once. Small enough not to flood the database, big enough that ~40 tours take a few seconds.
const CONCURRENCY = 4;

const keyOf = (code: string) => code.trim().toUpperCase();

/**
 * Adds the tours of the Google Sheet ("Gợi ý chuyến đi", same parser) to the database through the regular
 * tours API, so they show up in Quản lý Tour next to the other tours.
 *
 * It only runs while the database holds no sheet tour yet (a first-time fill). After that the admin owns the
 * rows: edits are never overwritten and a deleted tour does not come back. The MÃ column is the key
 * (`id` = MÃ), so a second run, or two admins opening the page at once, never creates duplicates.
 *
 * @param existing the tours currently in the database
 */
export async function addSheetToursIfMissing(existing: Tour[]): Promise<SheetSyncResult> {
  const result: SheetSyncResult = { created: 0, failed: [] };
  if (existing.some((t) => t.code)) return result;

  const known = new Set(existing.map((t) => keyOf(t.id)));
  const sheetTours = (await fetchSheetTours()).filter((t) => !known.has(keyOf(t.code ?? t.id)));

  const addOne = async (tour: Tour) => {
    const code = tour.code ?? tour.id;
    try {
      await api.createTour({ ...tour, id: code, code });
      result.created++;
    } catch (err) {
      // A parallel run (second tab / admin) may have inserted this MÃ a moment ago: then it already exists, which is fine
      const alreadyThere = (await api.getTours().catch(() => [] as Tour[])).some((t) => keyOf(t.id) === keyOf(code));
      if (!alreadyThere) result.failed.push({ code, message: err instanceof Error ? err.message : String(err) });
    }
  };

  for (let i = 0; i < sheetTours.length; i += CONCURRENCY) {
    await Promise.all(sheetTours.slice(i, i + CONCURRENCY).map(addOne));
  }
  return result;
}
