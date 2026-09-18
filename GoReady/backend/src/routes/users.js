import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listUsers, loginUser, registerUser, toggleUserStatus, updateUserAvatar } from '../../../lib/users.js';

const router = Router();
const pool = getPool();

router.get('/', async (_req, res) => {
  res.json(await listUsers(pool));
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  try {
    const user = await registerUser(pool, name, email, password);
    res.status(201).json(user);
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: 'email_taken' });
    throw err;
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const user = await loginUser(pool, email, password);
    res.json(user);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: 'invalid_credentials' });
    if (err.status === 403) return res.status(403).json({ error: 'locked' });
    throw err;
  }
});

// PATCH /api/users/:id/avatar
router.patch('/:id/avatar', async (req, res) => {
  const { avatar } = req.body;
  if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
    return res.status(400).json({ error: 'avatar must be an image data URL' });
  }
  try {
    const user = await updateUserAvatar(pool, req.params.id, avatar);
    res.json(user);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'User not found' });
    throw err;
  }
});

router.patch('/:id/status', async (req, res) => {
  const user = await toggleUserStatus(pool, req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
