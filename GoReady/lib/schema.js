import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createTour } from './tours.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    slug TEXT,
    name TEXT,
    destination TEXT,
    country TEXT,
    region TEXT,
    "coverImage" TEXT,
    gallery JSONB,
    "shortDescription" TEXT,
    description TEXT,
    price INTEGER,
    "discountPrice" INTEGER,
    duration INTEGER,
    nights INTEGER,
    departure TEXT,
    "hotelStars" INTEGER,
    transport TEXT,
    "styleTags" JSONB,
    "groupSizeTags" JSONB,
    rating REAL,
    "reviewCount" INTEGER,
    "bookingCount" INTEGER,
    itinerary JSONB,
    includes JSONB,
    excludes JSONB,
    reviews JSONB,
    highlights JSONB,
    "cancellationPolicy" TEXT,
    route JSONB,
    hidden BOOLEAN DEFAULT FALSE
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    "bookingCode" TEXT,
    "tourId" TEXT,
    "departureDate" TEXT,
    "departureCode" TEXT,
    adults INTEGER,
    children INTEGER,
    infants INTEGER,
    "addOns" JSONB,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    note TEXT,
    "totalPrice" INTEGER,
    "paymentMethod" TEXT,
    status TEXT,
    "createdAt" TEXT,
    "guideName" TEXT,
    "guidePhone" TEXT,
    "hotelName" TEXT,
    "pickupTime" TEXT,
    "pickupLocation" TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    "joinedAt" TEXT,
    "totalBookings" INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    avatar TEXT
  );
`;

let ensured = false;

export async function ensureSchema(pool) {
  if (ensured) return;
  await pool.query(CREATE_SQL);
  // Safe migrations for existing databases that don't have these columns yet
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);
  await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "departureCode" TEXT`);
  ensured = true;
}

async function insertRow(pool, table, jsonFields, row) {
  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => (jsonFields.includes(c) ? JSON.stringify(row[c] ?? []) : row[c]));
  await pool.query(`INSERT INTO ${table} (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);
}

export async function seedIfEmpty(pool) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM tours');
  if (rows[0].count > 0) {
    // Even if tours exist, ensure admin account exists
    await ensureAdminAccount(pool);
    return;
  }

  const tours = JSON.parse(readFileSync(join(__dirname, 'seed-data', 'tours.json'), 'utf-8'));
  const users = JSON.parse(readFileSync(join(__dirname, 'seed-data', 'users.json'), 'utf-8'));
  const bookings = JSON.parse(readFileSync(join(__dirname, 'seed-data', 'bookings.json'), 'utf-8'));

  for (const t of tours) await createTour(pool, t);
  for (const u of users) await insertRow(pool, 'users', [], u);
  for (const b of bookings) await insertRow(pool, 'bookings', ['addOns'], b);

  await ensureAdminAccount(pool);
  console.log(`Seeded database: ${tours.length} tours, ${users.length} users, ${bookings.length} bookings`);
}

// Always ensure the admin account exists (idempotent)
async function ensureAdminAccount(pool) {
  const { rows } = await pool.query(`SELECT id FROM users WHERE lower(email) = 'admin@goready.vn'`);
  if (rows.length > 0) return;

  // Import bcrypt dynamically to avoid top-level issues
  const { default: bcrypt } = await import('bcrypt');
  const hash = await bcrypt.hash('GoReady@2025!', 10);
  const { randomUUID } = await import('node:crypto');

  await pool.query(
    `INSERT INTO users (id, name, email, phone, "joinedAt", "totalBookings", status, password_hash, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      `usr-${randomUUID()}`,
      'Quản trị viên',
      'admin@goready.vn',
      '',
      new Date().toISOString().slice(0, 10),
      0,
      'active',
      hash,
      'admin',
    ]
  );
  console.log('Admin account created: admin@goready.vn / GoReady@2025!');
}
