import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import { listArticles, createArticle, updateArticle, toggleArticleHidden, deleteArticle } from '../../../lib/articles.js';

const router = Router();
const pool = getPool();

// Express 4 does not catch rejected promises from async handlers
const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

router.get('/', wrap(async (_req, res) => {
  res.json(await listArticles(pool));
}));

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await createArticle(pool, req.body));
}));

router.put('/:id', wrap(async (req, res) => {
  const article = await updateArticle(pool, req.params.id, req.body);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
}));

router.patch('/:id/hidden', wrap(async (req, res) => {
  const article = await toggleArticleHidden(pool, req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
}));

router.delete('/:id', wrap(async (req, res) => {
  await deleteArticle(pool, req.params.id);
  res.status(204).end();
}));

export default router;
