import { randomUUID } from 'node:crypto';

// Tour photos uploaded from the admin console. They live in their own table and are served from /api/images/:id, so a
// tour only stores a short URL (the tour list is polled every few seconds and must stay small).

// Decoded size. The browser already downsizes photos to ~0.5 MB; this cap also keeps the base64 request under
// Vercel's 4.5 MB body limit.
export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** A problem with the uploaded image itself (as opposed to a server fault): `status` is the HTTP status to answer with. */
export class ImageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** "data:image/jpeg;base64,...." → { mime, data: Buffer }. Throws ImageError when it is not an acceptable image. */
export function decodeDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\r\n]+)$/) : null;
  if (!match) throw new ImageError('Ảnh không hợp lệ');

  const mime = match[1].toLowerCase();
  if (!MIME_TYPES.includes(mime)) throw new ImageError('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF');

  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0) throw new ImageError('Ảnh không hợp lệ');
  if (data.length > MAX_IMAGE_BYTES) throw new ImageError('Ảnh quá lớn (tối đa 2,5 MB sau khi nén)', 413);
  return { mime, data };
}

/** Stores an image and returns { id, url } — `url` is what goes into a tour's coverImage / gallery. */
export async function saveImage(pool, dataUrl) {
  const { mime, data } = decodeDataUrl(dataUrl);
  const id = `img-${randomUUID()}`;
  await pool.query('INSERT INTO images (id, mime, data, "createdAt") VALUES ($1, $2, $3, $4)', [id, mime, data, new Date().toISOString()]);
  return { id, url: `/api/images/${id}` };
}

/** { mime, data: Buffer } or null when there is no such image. */
export async function getImage(pool, id) {
  const { rows } = await pool.query('SELECT mime, data FROM images WHERE id = $1', [id]);
  // pg hands back a Buffer; normalise anyway so res.send() always treats it as binary and never as JSON
  return rows[0] ? { mime: rows[0].mime, data: Buffer.from(rows[0].data) } : null;
}
