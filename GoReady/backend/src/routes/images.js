import express, { Router } from 'express';
import { getImage, saveImage, ImageError } from '../../../lib/images.js';

// A factory (not a module-level pool like the other routers) so the router can be mounted on its own with a
// bigger JSON body limit than the rest of the API, and exercised in tests with any pg-compatible pool.
export default function imagesRouter(pool) {
  const router = Router();
  const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

  // base64 in JSON: the 2.5 MB image cap becomes ~3.4 MB of text
  router.post(
    '/',
    express.json({ limit: '5mb' }),
    wrap(async (req, res) => {
      res.status(201).json(await saveImage(pool, req.body?.dataUrl));
    }),
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const image = await getImage(pool, req.params.id);
      if (!image) return res.status(404).json({ error: 'Image not found' });
      // Ids are never reused, so browsers may keep the file forever
      res.set({ 'Content-Type': image.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
      res.send(image.data);
    }),
  );

  router.use((err, _req, res, next) => {
    if (err instanceof ImageError) return res.status(err.status).json({ error: err.message });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Ảnh quá lớn' });
    next(err);
  });

  return router;
}
