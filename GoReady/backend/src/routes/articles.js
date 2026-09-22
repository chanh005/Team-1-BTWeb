import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import {
  listArticles, createArticle, updateArticle, toggleArticleHidden, deleteArticle, incrementArticleViews,
  getArticleFeedback, addComment, rateArticle, listAllComments, setCommentHidden, deleteComment,
} from '../../../lib/articles.js';

const router = Router();
const pool = getPool();

// Express 4 does not catch rejected promises from async handlers. Errors carrying a `status` (validation,
// unknown user/article) are answered with it; the rest go to the global 500 handler
const wrap = (handler) => (req, res, next) =>
  handler(req, res).catch((err) => (err.status ? res.status(err.status).json({ error: err.message }) : next(err)));

router.get('/', wrap(async (req, res) => {
  // ?public=1: only what Bảng tin readers may see (no hidden, draft or not-yet-due articles)
  res.json(await listArticles(pool, { publicOnly: req.query.public === '1' }));
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

router.post('/:id/view', wrap(async (req, res) => {
  const views = await incrementArticleViews(pool, req.params.id);
  if (views === null) return res.status(404).json({ error: 'Article not found' });
  res.json({ views });
}));

router.get('/:id/comments', wrap(async (req, res) => {
  res.json(await getArticleFeedback(pool, req.params.id, req.query.userId));
}));

router.post('/:id/comments', wrap(async (req, res) => {
  res.status(201).json(await addComment(pool, req.params.id, req.body?.userId, req.body?.content));
}));

router.put('/:id/rating', wrap(async (req, res) => {
  res.json(await rateArticle(pool, req.params.id, req.body?.userId, req.body?.rating));
}));

// Admin: kiểm duyệt bình luận (mounted at /api/comments)
export const commentsRouter = Router();

commentsRouter.get('/', wrap(async (_req, res) => {
  res.json(await listAllComments(pool));
}));

commentsRouter.patch('/:id', wrap(async (req, res) => {
  const comment = await setCommentHidden(pool, req.params.id, req.body?.hidden);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  res.json(comment);
}));

commentsRouter.delete('/:id', wrap(async (req, res) => {
  await deleteComment(pool, req.params.id);
  res.status(204).end();
}));

export default router;
