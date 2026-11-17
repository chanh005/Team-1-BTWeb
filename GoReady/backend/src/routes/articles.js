import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  resolveAdmin,
} from '../../../lib/articles.js';

const router = Router();
const pool = getPool();

// Express 4 không bắt lỗi của hàm async: bọc lại để lỗi nghiệp vụ (có status) trả JSON, lỗi khác đi tới error handler
const route = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// Thao tác ghi chỉ dành cho admin: đối chiếu x-user-id / x-user-email với bảng users (không tin role từ header)
async function requireAdmin(req, res) {
  const admin = await resolveAdmin(pool, { id: req.headers['x-user-id'], email: req.headers['x-user-email'] });
  if (!admin) {
    res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này' });
    return null;
  }
  return admin;
}

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Mã bài viết không hợp lệ');
    err.status = 400;
    throw err;
  }
  return id;
};

const boolQuery = (value) => (value === undefined ? undefined : value === 'true');

// ----- Công khai -----

// GET /api/articles?page&limit&showOnFeed&category
router.get('/', route(async (req, res) => {
  res.json(await getArticles(pool, {
    publicOnly: true,
    page: req.query.page,
    limit: req.query.limit,
    showOnFeed: boolQuery(req.query.showOnFeed),
    category: req.query.category,
  }));
}));

// GET /api/articles/slug/:slug — tăng lượt xem
router.get('/slug/:slug', route(async (req, res) => {
  const article = await getArticleBySlug(pool, req.params.slug);
  if (!article) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json(article);
}));

// ----- Quản trị (cần quyền admin) -----

// GET /api/articles/manage?status&category&search — gồm cả nháp và bài lưu trữ
router.get('/manage', route(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json(await getArticles(pool, {
    status: req.query.status || undefined,
    category: req.query.category || undefined,
    search: req.query.search || undefined,
    showOnFeed: boolQuery(req.query.showOnFeed),
    page: req.query.page,
    limit: req.query.limit ?? 100,
  }));
}));

// POST /api/articles
router.post('/', route(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.status(201).json(await createArticle(pool, req.body || {}));
}));

// PUT /api/articles/:id
router.put('/:id', route(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json(await updateArticle(pool, parseId(req.params.id), req.body || {}));
}));

// DELETE /api/articles/:id
router.delete('/:id', route(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json(await deleteArticle(pool, parseId(req.params.id)));
}));

export default router;
