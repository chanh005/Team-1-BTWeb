import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Strip password_hash from returned objects — never expose to client
function sanitize(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

export async function listUsers(pool) {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY "joinedAt" DESC');
  return rows.map(sanitize);
}

/** Register a brand-new account. Throws if email already taken. */
export async function registerUser(pool, name, email, password) {
  const { rows: existing } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.length > 0) {
    const err = new Error('email_taken');
    err.status = 409;
    throw err;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: `usr-${randomUUID()}`,
    name,
    email,
    phone: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    totalBookings: 0,
    status: 'active',
    password_hash: hash,
    role: 'user',
  };

  await pool.query(
    `INSERT INTO users (id, name, email, phone, "joinedAt", "totalBookings", status, password_hash, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [user.id, user.name, user.email, user.phone, user.joinedAt, user.totalBookings, user.status, user.password_hash, user.role]
  );

  return sanitize(user);
}

/** Login with email + password. Returns the user (with role). */
export async function loginUser(pool, email, password) {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = rows[0];

  if (!user) {
    const err = new Error('invalid_credentials');
    err.status = 401;
    throw err;
  }

  if (user.status === 'locked') {
    const err = new Error('locked');
    err.status = 403;
    throw err;
  }

  // Support legacy demo accounts that have no password_hash
  if (user.password_hash) {
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const err = new Error('invalid_credentials');
      err.status = 401;
      throw err;
    }
  }

  return sanitize(user);
}

/** Update the avatar (a data URL) for a user. */
export async function updateUserAvatar(pool, id, avatar) {
  const { rows } = await pool.query('UPDATE users SET avatar = $1 WHERE id = $2 RETURNING *', [avatar, id]);
  if (!rows[0]) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return sanitize(rows[0]);
}

export async function toggleUserStatus(pool, id) {
  const { rows: existing } = await pool.query('SELECT status FROM users WHERE id = $1', [id]);
  if (!existing[0]) return null;
  const status = existing[0].status === 'active' ? 'locked' : 'active';
  await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return sanitize(rows[0]);
}
