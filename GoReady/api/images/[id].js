import { getPool } from '../../lib/db.js';
import { ensureSchema } from '../../lib/schema.js';
import { getImage } from '../../lib/images.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const pool = getPool();
  await ensureSchema(pool);
  const image = await getImage(pool, req.query.id);
  if (!image) return res.status(404).json({ error: 'Image not found' });
  // Ids are never reused, so browsers may keep the file forever
  res.setHeader('Content-Type', image.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(200).send(image.data);
}
