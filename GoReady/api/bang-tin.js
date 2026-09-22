import { getPool } from '../lib/db.js';
import { ensureSchema, seedArticlesOnce } from '../lib/schema.js';
import {
  listArticles, createArticle, updateArticle, toggleArticleHidden, deleteArticle, incrementArticleViews,
  getArticleFeedback, addComment, rateArticle, listAllComments, setCommentHidden, deleteComment,
} from '../lib/articles.js';

/**
 * Một function Vercel duy nhất cho toàn bộ API Bảng tin (+ /api/health), vì gói Hobby chỉ cho 12 function.
 * vercel.json chuyển các đường dẫn cũ về đây và giữ nguyên URL, nên frontend không đổi gì:
 *
 *   GET/POST          /api/articles                 (?public=1: chỉ bài người đọc được xem)
 *   PUT/DELETE        /api/articles/:id
 *   PATCH             /api/articles/:id/hidden
 *   POST              /api/articles/:id/view
 *   GET/POST          /api/articles/:id/comments     (GET ?userId=)
 *   PUT               /api/articles/:id/rating
 *   GET               /api/comments                  (admin: kiểm duyệt)
 *   PATCH/DELETE      /api/comments/:id
 *   GET               /api/health
 *
 * Ở máy local, backend Express (backend/src/routes/articles.js) phục vụ cùng các đường dẫn này.
 */

// "articles/abc/comments" → ['articles', 'abc', 'comments']. vercel.json truyền đường dẫn qua ?route=; nếu thiếu
// (gọi thẳng /api/bang-tin) thì đọc từ URL gốc.
function routeSegments(req) {
  const raw = req.query.route ?? new URL(req.url, 'http://localhost').pathname.replace(/^\/api\//, '');
  const route = Array.isArray(raw) ? raw.join('/') : String(raw);
  return route.split('/').filter(Boolean).map(decodeURIComponent);
}

const methodNotAllowed = (res, allow) => {
  res.setHeader('Allow', allow);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function articles(pool, req, res, [id, action, ...rest]) {
  const { method } = req;
  if (rest.length) return res.status(404).json({ error: 'Not found' });

  if (!id) {
    await seedArticlesOnce(pool);
    if (method === 'GET') return res.status(200).json(await listArticles(pool, { publicOnly: req.query.public === '1' }));
    if (method === 'POST') return res.status(201).json(await createArticle(pool, req.body));
    return methodNotAllowed(res, 'GET, POST');
  }

  if (!action) {
    if (method === 'PUT') {
      const article = await updateArticle(pool, id, req.body);
      return article ? res.status(200).json(article) : res.status(404).json({ error: 'Article not found' });
    }
    if (method === 'DELETE') {
      await deleteArticle(pool, id);
      return res.status(204).end();
    }
    return methodNotAllowed(res, 'PUT, DELETE');
  }

  if (action === 'hidden') {
    if (method !== 'PATCH') return methodNotAllowed(res, 'PATCH');
    const article = await toggleArticleHidden(pool, id);
    return article ? res.status(200).json(article) : res.status(404).json({ error: 'Article not found' });
  }
  if (action === 'view') {
    if (method !== 'POST') return methodNotAllowed(res, 'POST');
    const views = await incrementArticleViews(pool, id);
    return views === null ? res.status(404).json({ error: 'Article not found' }) : res.status(200).json({ views });
  }
  if (action === 'comments') {
    if (method === 'GET') return res.status(200).json(await getArticleFeedback(pool, id, req.query.userId));
    if (method === 'POST') return res.status(201).json(await addComment(pool, id, req.body?.userId, req.body?.content));
    return methodNotAllowed(res, 'GET, POST');
  }
  if (action === 'rating') {
    if (method !== 'PUT') return methodNotAllowed(res, 'PUT');
    return res.status(200).json(await rateArticle(pool, id, req.body?.userId, req.body?.rating));
  }
  return res.status(404).json({ error: 'Not found' });
}

async function comments(pool, req, res, [id, ...rest]) {
  const { method } = req;
  if (rest.length) return res.status(404).json({ error: 'Not found' });

  if (!id) {
    if (method !== 'GET') return methodNotAllowed(res, 'GET');
    return res.status(200).json(await listAllComments(pool));
  }
  if (method === 'PATCH') {
    const comment = await setCommentHidden(pool, id, req.body?.hidden);
    return comment ? res.status(200).json(comment) : res.status(404).json({ error: 'Comment not found' });
  }
  if (method === 'DELETE') {
    await deleteComment(pool, id);
    return res.status(204).end();
  }
  return methodNotAllowed(res, 'PATCH, DELETE');
}

export default async function handler(req, res) {
  const [resource, ...params] = routeSegments(req);

  // Không cần database, giống api/health.js trước đây
  if (resource === 'health') return res.status(200).json({ ok: true });
  if (resource !== 'articles' && resource !== 'comments') return res.status(404).json({ error: 'Not found' });

  const pool = getPool();
  await ensureSchema(pool);
  try {
    if (resource === 'articles') return await articles(pool, req, res, params);
    return await comments(pool, req, res, params);
  } catch (err) {
    // Lỗi có `status` (dữ liệu không hợp lệ, không có user/bài viết) trả về đúng mã; lỗi khác để Vercel báo 500
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}
