import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listUsers, loginOrRegister, toggleUserStatus } from '../../../lib/users.js';

const router = Router();
const pool = getPool();

router.get('/', async (_req, res) => {
  res.json(await listUsers(pool));
});

router.post('/login', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  try {
    res.json(await loginOrRegister(pool, name, email));
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'locked' });
    throw err;
  }
});

router.patch('/:id/status', async (req, res) => {
  const user = await toggleUserStatus(pool, req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
