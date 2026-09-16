import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'goready.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    slug TEXT,
    name TEXT,
    destination TEXT,
    country TEXT,
    region TEXT,
    coverImage TEXT,
    gallery TEXT,
    shortDescription TEXT,
    description TEXT,
    price INTEGER,
    discountPrice INTEGER,
    duration INTEGER,
    nights INTEGER,
    departure TEXT,
    hotelStars INTEGER,
    transport TEXT,
    styleTags TEXT,
    groupSizeTags TEXT,
    rating REAL,
    reviewCount INTEGER,
    bookingCount INTEGER,
    itinerary TEXT,
    includes TEXT,
    excludes TEXT,
    reviews TEXT,
    highlights TEXT,
    cancellationPolicy TEXT,
    route TEXT,
    hidden INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    bookingCode TEXT,
    tourId TEXT,
    departureDate TEXT,
    adults INTEGER,
    children INTEGER,
    infants INTEGER,
    addOns TEXT,
    contactName TEXT,
    contactPhone TEXT,
    contactEmail TEXT,
    note TEXT,
    totalPrice INTEGER,
    paymentMethod TEXT,
    status TEXT,
    createdAt TEXT,
    guideName TEXT,
    guidePhone TEXT,
    hotelName TEXT,
    pickupTime TEXT,
    pickupLocation TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    joinedAt TEXT,
    totalBookings INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
  );
`);

const JSON_TOUR_FIELDS = ['gallery', 'styleTags', 'groupSizeTags', 'itinerary', 'includes', 'excludes', 'reviews', 'highlights', 'route'];

export const rowToTour = (row) => {
  const tour = { ...row, hidden: !!row.hidden };
  for (const f of JSON_TOUR_FIELDS) tour[f] = JSON.parse(row[f] ?? '[]');
  if (tour.discountPrice === null) delete tour.discountPrice;
  return tour;
};

export const tourToRow = (t) => ({
  id: t.id,
  slug: t.slug ?? t.id,
  name: t.name ?? '',
  destination: t.destination ?? '',
  country: t.country ?? '',
  region: t.region ?? 'Việt Nam',
  coverImage: t.coverImage ?? '',
  gallery: JSON.stringify(t.gallery ?? []),
  shortDescription: t.shortDescription ?? '',
  description: t.description ?? t.shortDescription ?? '',
  price: t.price ?? 0,
  discountPrice: t.discountPrice ?? null,
  duration: t.duration ?? 1,
  nights: t.nights ?? 0,
  departure: t.departure ?? 'TP. Hồ Chí Minh',
  hotelStars: t.hotelStars ?? 3,
  transport: t.transport ?? '',
  styleTags: JSON.stringify(t.styleTags ?? []),
  groupSizeTags: JSON.stringify(t.groupSizeTags ?? []),
  rating: t.rating ?? 0,
  reviewCount: t.reviewCount ?? 0,
  bookingCount: t.bookingCount ?? 0,
  itinerary: JSON.stringify(t.itinerary ?? []),
  includes: JSON.stringify(t.includes ?? []),
  excludes: JSON.stringify(t.excludes ?? []),
  reviews: JSON.stringify(t.reviews ?? []),
  highlights: JSON.stringify(t.highlights ?? []),
  cancellationPolicy: t.cancellationPolicy ?? '',
  route: JSON.stringify(t.route ?? []),
  hidden: t.hidden ? 1 : 0,
});

export const rowToBooking = (row) => ({ ...row, addOns: JSON.parse(row.addOns ?? '[]') });

export const bookingToRow = (b) => ({ ...b, addOns: JSON.stringify(b.addOns ?? []), note: b.note ?? null });

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM tours').get();
  if (count > 0) return;

  const tours = JSON.parse(readFileSync(join(__dirname, '..', 'seed-data', 'tours.json'), 'utf-8'));
  const users = JSON.parse(readFileSync(join(__dirname, '..', 'seed-data', 'users.json'), 'utf-8'));
  const bookings = JSON.parse(readFileSync(join(__dirname, '..', 'seed-data', 'bookings.json'), 'utf-8'));

  const tourCols = Object.keys(tourToRow(tours[0]));
  const insertTour = db.prepare(`INSERT INTO tours (${tourCols.join(',')}) VALUES (${tourCols.map((c) => `@${c}`).join(',')})`);
  for (const t of tours) insertTour.run(tourToRow(t));

  const insertUser = db.prepare('INSERT INTO users (id, name, email, phone, joinedAt, totalBookings, status) VALUES (@id, @name, @email, @phone, @joinedAt, @totalBookings, @status)');
  for (const u of users) insertUser.run(u);

  const bookingCols = Object.keys(bookingToRow(bookings[0]));
  const insertBooking = db.prepare(`INSERT INTO bookings (${bookingCols.join(',')}) VALUES (${bookingCols.map((c) => `@${c}`).join(',')})`);
  for (const b of bookings) insertBooking.run(bookingToRow(b));

  console.log(`Seeded database: ${tours.length} tours, ${users.length} users, ${bookings.length} bookings`);
}

seedIfEmpty();
