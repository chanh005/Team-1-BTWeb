import { randomUUID } from 'node:crypto';

const JSON_FIELDS = ['gallery', 'styleTags', 'groupSizeTags', 'itinerary', 'includes', 'excludes', 'reviews', 'highlights', 'route', 'keywords'];

// Columns that only tours imported from the Google Sheet fill in. They are omitted from the JSON of other tours
// (instead of `null`) so the front end can keep testing them with `tour.code` / `tour.childPrice !== undefined`.
const SHEET_FIELDS = ['code', 'durationLabel', 'childPrice', 'category', 'keywords'];

// Every writable column of `tours`; anything else in a request body (e.g. unknown keys) is ignored
const COLUMNS = [
  'id', 'slug', 'name', 'destination', 'country', 'region', 'coverImage', 'gallery', 'shortDescription', 'description',
  'price', 'discountPrice', 'duration', 'nights', 'departure', 'hotelStars', 'transport', 'styleTags', 'groupSizeTags',
  'rating', 'reviewCount', 'bookingCount', 'itinerary', 'includes', 'excludes', 'reviews', 'highlights',
  'cancellationPolicy', 'route', 'hidden', ...SHEET_FIELDS,
];

function serialize(row) {
  if (!row) return row;
  const out = { ...row };
  for (const f of SHEET_FIELDS) if (out[f] === null || out[f] === undefined) delete out[f];
  return out;
}

export async function listTours(pool) {
  const { rows } = await pool.query('SELECT * FROM tours ORDER BY name');
  return rows.map(serialize);
}

export async function createTour(pool, body) {
  const id = body.id || `tour-${randomUUID()}`;
  const row = {
    id,
    slug: body.slug || id,
    name: body.name ?? '',
    destination: body.destination ?? '',
    country: body.country ?? '',
    region: body.region ?? 'Việt Nam',
    coverImage: body.coverImage ?? '',
    gallery: body.gallery ?? [],
    shortDescription: body.shortDescription ?? '',
    description: body.description ?? body.shortDescription ?? '',
    price: body.price ?? 0,
    discountPrice: body.discountPrice ?? null,
    duration: body.duration ?? 1,
    nights: body.nights ?? 0,
    departure: body.departure ?? 'TP. Hồ Chí Minh',
    hotelStars: body.hotelStars ?? 3,
    transport: body.transport ?? '',
    styleTags: body.styleTags ?? [],
    groupSizeTags: body.groupSizeTags ?? [],
    rating: body.rating ?? 0,
    reviewCount: body.reviewCount ?? 0,
    bookingCount: body.bookingCount ?? 0,
    itinerary: body.itinerary ?? [],
    includes: body.includes ?? [],
    excludes: body.excludes ?? [],
    reviews: body.reviews ?? [],
    highlights: body.highlights ?? [],
    cancellationPolicy: body.cancellationPolicy ?? 'Hoàn 100% nếu huỷ trước 7 ngày khởi hành.',
    route: body.route ?? [],
    hidden: body.hidden ?? false,
    code: body.code ?? null,
    durationLabel: body.durationLabel ?? null,
    childPrice: body.childPrice ?? null,
    category: body.category ?? null,
    keywords: body.keywords ?? [],
  };

  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => (JSON_FIELDS.includes(c) ? JSON.stringify(row[c]) : row[c]));
  await pool.query(`INSERT INTO tours (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);

  const { rows } = await pool.query('SELECT * FROM tours WHERE id = $1', [id]);
  return serialize(rows[0]);
}

export async function updateTour(pool, id, patch) {
  const { rows: existing } = await pool.query('SELECT * FROM tours WHERE id = $1', [id]);
  if (!existing[0]) return null;

  const merged = { ...existing[0], ...patch, id };
  const cols = Object.keys(merged).filter((c) => c !== 'id' && COLUMNS.includes(c));
  const setClause = cols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const values = cols.map((c) => (JSON_FIELDS.includes(c) ? JSON.stringify(merged[c] ?? []) : merged[c]));
  await pool.query(`UPDATE tours SET ${setClause} WHERE id = $1`, [id, ...values]);

  const { rows } = await pool.query('SELECT * FROM tours WHERE id = $1', [id]);
  return serialize(rows[0]);
}

export async function toggleTourHidden(pool, id) {
  const { rows: existing } = await pool.query('SELECT hidden FROM tours WHERE id = $1', [id]);
  if (!existing[0]) return null;
  await pool.query('UPDATE tours SET hidden = $1 WHERE id = $2', [!existing[0].hidden, id]);
  const { rows } = await pool.query('SELECT * FROM tours WHERE id = $1', [id]);
  return serialize(rows[0]);
}

export async function deleteTour(pool, id) {
  await pool.query('DELETE FROM tours WHERE id = $1', [id]);
}
