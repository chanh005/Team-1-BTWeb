import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { saveImage, ImageError } from '../../lib/images.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  try {
    return res.status(201).json(await saveImage(pool, req.body?.dataUrl));
  } catch (err) {
    if (err instanceof ImageError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}
