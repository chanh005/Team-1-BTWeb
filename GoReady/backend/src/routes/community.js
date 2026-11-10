import { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import {
  listPublicPosts,
  getPostBySlug,
  incrementPostView,
  createPost,
  updatePost,
  deletePost,
  listPostsForModeration,
  moderatePost,
  bulkPublishPosts,
  setUserPostBan,
  toggleReaction,
  toggleSave,
  createComment,
  deleteComment,
  listComments,
  createReport,
  listReports,
  handleReport
} from '../../../lib/community/service.js';

const router = Router();
const pool = getPool();

/**
 * Trích xuất thông tin người dùng từ request (header hoặc query/body)
 */
async function extractUser(req) {
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
  const userEmail = req.headers['x-user-email'] || req.body?.userEmail || req.query?.userEmail;
  const userName = req.headers['x-user-name'] || req.body?.userName;
  const userRole = req.headers['x-user-role'] || req.body?.userRole;

  if (!userId && !userEmail) return null;

  try {
    let dbUser = null;
    if (userEmail) {
      const res = await pool.query('SELECT id, name, email, role, status FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);
      if (res.rows.length > 0) dbUser = res.rows[0];
    } else if (userId) {
      const res = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [userId]);
      if (res.rows.length > 0) dbUser = res.rows[0];
    }
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role || 'user',
        status: dbUser.status
      };
    }
  } catch {
    // ignore query failure, fallback to headers
  }

  return {
    id: userId || userEmail,
    email: userEmail || '',
    name: userName || 'Người dùng',
    role: userRole || 'user'
  };
}

// ----------------------------------------------------
// BÀI VIẾT CÔNG KHAI
// ----------------------------------------------------

// GET /api/community/posts
router.get('/posts', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const options = {
      group: req.query.group,
      destination: req.query.destination,
      kind: req.query.kind,
      sort: req.query.sort || 'newest',
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      search: req.query.search,
    };
    const result = await listPublicPosts(pool, options, user?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/community/posts/:slug
router.get('/posts/:slug', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const post = await getPostBySlug(pool, req.params.slug, user);
    res.json(post);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/community/posts/:id/view
router.post('/posts/:id/view', async (req, res, next) => {
  try {
    const result = await incrementPostView(pool, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/community/posts
router.post('/posts', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này' });
    }
    const post = await createPost(pool, req.body, user);
    res.status(201).json(post);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PUT /api/community/posts/:id
router.put('/posts/:id', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này' });
    }
    const updated = await updatePost(pool, req.params.id, req.body, user);
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/community/posts/:id
router.delete('/posts/:id', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này' });
    }
    const result = await deletePost(pool, req.params.id, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ----------------------------------------------------
// TƯƠNG TÁC: THÍCH / LƯU / BÌNH LUẬN / BÁO CÁO
// ----------------------------------------------------

// POST /api/community/posts/:id/like
router.post('/posts/:id/like', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const result = await toggleReaction(pool, req.params.id, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/community/posts/:id/save
router.post('/posts/:id/save', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const result = await toggleSave(pool, req.params.id, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/community/posts/:id/comments
router.get('/posts/:id/comments', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const comments = await listComments(pool, req.params.id, { page, limit });
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để bình luận' });
    const { content, parentId } = req.body;
    const comment = await createComment(pool, { postId: req.params.id, parentId, content }, user);
    res.status(201).json(comment);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /api/community/comments/:id
router.delete('/comments/:id', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const result = await deleteComment(pool, req.params.id, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/community/reports
router.post('/reports', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để báo cáo' });
    const { targetType, targetId, reason } = req.body;
    const result = await createReport(pool, { targetType, targetId, reason }, user);
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ----------------------------------------------------
// KIỂM DUYỆT & QUẢN TRỊ (CHỈ ADMIN)
// ----------------------------------------------------

// GET /api/community/admin/posts
router.get('/admin/posts', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await listPostsForModeration(pool, status, page, limit, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /api/community/admin/posts/:id/moderate
router.patch('/admin/posts/:id/moderate', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const { action, reason } = req.body;
    const result = await moderatePost(pool, req.params.id, { action, reason }, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/community/admin/posts/bulk-publish
router.post('/admin/posts/bulk-publish', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const { postIds } = req.body;
    const result = await bulkPublishPosts(pool, postIds, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/community/admin/users/ban
router.post('/admin/users/ban', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const { userId, isBanned, note } = req.body;
    const result = await setUserPostBan(pool, { userId, isBanned, note }, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/community/admin/reports
router.get('/admin/reports', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const status = req.query.status || 'open';
    const reports = await listReports(pool, status, user);
    res.json(reports);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /api/community/admin/reports/:id
router.patch('/admin/reports/:id', async (req, res, next) => {
  try {
    const user = await extractUser(req);
    const { status, note } = req.body;
    const result = await handleReport(pool, req.params.id, { status, note }, user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;

