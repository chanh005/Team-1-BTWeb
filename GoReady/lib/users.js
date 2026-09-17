import { randomUUID } from 'node:crypto';

export async function listUsers(pool) {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY "joinedAt" DESC');
  return rows;
}

// Demo auth: no password, just name + email. Creates the account on first login.
export async function loginOrRegister(pool, name, email) {
  const { rows: existing } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing[0]) {
    if (existing[0].status === 'locked') {
      const err = new Error('locked');
      err.status = 403;
      throw err;
    }
    return existing[0];
  }

  const user = {
    id: `usr-${randomUUID()}`,
    name,
    email,
    phone: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    totalBookings: 0,
    status: 'active',
  };
  await pool.query(
    'INSERT INTO users (id, name, email, phone, "joinedAt", "totalBookings", status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [user.id, user.name, user.email, user.phone, user.joinedAt, user.totalBookings, user.status]
  );
  return user;
}

export async function toggleUserStatus(pool, id) {
  const { rows: existing } = await pool.query('SELECT status FROM users WHERE id = $1', [id]);
  if (!existing[0]) return null;
  const status = existing[0].status === 'active' ? 'locked' : 'active';
  await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}
