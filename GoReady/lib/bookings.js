import { randomUUID } from 'node:crypto';

export async function listBookings(pool) {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY "createdAt" DESC');
  return rows;
}

export async function createBooking(pool, body) {
  const id = body.id || `booking-${randomUUID()}`;
  const row = { ...body, id, addOns: body.addOns ?? [], note: body.note ?? null };

  const cols = Object.keys(row);
  const quoted = cols.map((c) => `"${c}"`);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => (c === 'addOns' ? JSON.stringify(row[c]) : row[c]));
  await pool.query(`INSERT INTO bookings (${quoted.join(',')}) VALUES (${placeholders.join(',')})`, values);

  // Keep the account's totalBookings count in sync, if the contact email matches a registered user.
  await pool.query('UPDATE users SET "totalBookings" = "totalBookings" + 1 WHERE lower(email) = lower($1)', [row.contactEmail]);

  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0];
}

export async function updateBookingStatus(pool, id, status) {
  const { rows: existing } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (!existing[0]) return null;
  await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0];
}
