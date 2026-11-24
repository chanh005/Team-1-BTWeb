import express, { Router } from 'express';
import { getPool } from '../../../lib/db.js';
import {
  SellerError, saveSellerFile, getSellerFile, userFromAuthHeader, requireUser, registerSeller, loginSeller,
  getSellerByUser, resubmitSeller, PUBLIC_KINDS, listSellersForAdmin, reviewSeller,
} from '../../../lib/seller.js';
import {
  requireApprovedSeller, listSellerTours, getTourFull, createSellerTour, saveSellerTour, submitSellerTour, setSellerTourVisibility,
  deleteSellerTour, listToursForAdmin, reviewTour,
} from '../../../lib/sellerTours.js';
import { listSellerDepartures, listSellerReviews } from '../../../lib/sellerReports.js';
import { getSellerDashboard } from '../../../lib/sellerDashboard.js';
import { listSellerBookings, getSellerBooking, confirmSellerBooking, rejectSellerBooking, completeSellerBooking } from '../../../lib/sellerBookings.js';

const pool = getPool();
const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

function errorHandler(err, _req, res, next) {
  if (err instanceof SellerError) return res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'File quá lớn (tối đa 10MB)' });
  next(err);
}

// Upload + tải file: mount TRƯỚC express.json() chung (xem index.js), vì file base64 lớn hơn 2MB.
export const sellerFilesRouter = Router();
sellerFilesRouter.post('/', express.json({ limit: '15mb' }), wrap(async (req, res) => {
  res.status(201).json(await saveSellerFile(pool, req.body?.kind, req.body?.dataUrl));
}));
sellerFilesRouter.get('/:id', wrap(async (req, res) => {
  const viewer = await userFromAuthHeader(pool, req.headers.authorization);
  const file = await getSellerFile(pool, req.params.id, viewer);
  res.set({ 'Content-Type': file.mime, 'Cache-Control': PUBLIC_KINDS.includes(file.kind) ? 'public, max-age=31536000, immutable' : 'private, no-store' });
  res.send(file.data);
}));
sellerFilesRouter.use(errorHandler);

const router = Router();

router.post('/register', wrap(async (req, res) => {
  res.status(201).json(await registerSeller(pool, req.body || {}));
}));

router.post('/login', wrap(async (req, res) => {
  res.json(await loginSeller(pool, req.body?.email, req.body?.password));
}));

router.get('/me', wrap(async (req, res) => {
  const user = await requireUser(pool, req.headers.authorization);
  const seller = await getSellerByUser(pool, user.id);
  if (!seller) throw new SellerError('Tài khoản này chưa có hồ sơ người bán', 404);
  res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, seller });
}));

router.put('/me', wrap(async (req, res) => {
  const user = await requireUser(pool, req.headers.authorization, 'seller');
  res.json({ seller: await resubmitSeller(pool, user.id, req.body || {}) });
}));

// Admin: danh sách hồ sơ (mặc định chờ duyệt) + duyệt / từ chối
router.get('/admin/sellers', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await listSellersForAdmin(pool, req.query.status || 'pending'));
}));
router.post('/admin/sellers/:id/approve', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await reviewSeller(pool, req.params.id, 'approved'));
}));
router.post('/admin/sellers/:id/reject', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await reviewSeller(pool, req.params.id, 'rejected', req.body?.reason));
}));

// ----- Tour của người bán (chỉ seller đã được duyệt, chỉ thấy tour của chính mình) -----
router.get('/tours', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await listSellerTours(pool, seller.id, { status: req.query.status, q: req.query.q }));
}));
router.post('/tours', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.status(201).json(await createSellerTour(pool, seller, req.body || {}));
}));
router.get('/tours/:id', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  const tour = await getTourFull(pool, req.params.id, seller.id);
  if (!tour) throw new SellerError('Không tìm thấy tour', 404);
  res.json(tour);
}));
router.put('/tours/:id', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await saveSellerTour(pool, seller, req.params.id, req.body || {}));
}));
router.post('/tours/:id/submit', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await submitSellerTour(pool, seller, req.params.id));
}));
router.post('/tours/:id/hide', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await setSellerTourVisibility(pool, seller, req.params.id, true));
}));
router.post('/tours/:id/show', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await setSellerTourVisibility(pool, seller, req.params.id, false));
}));
router.delete('/tours/:id', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  await deleteSellerTour(pool, seller, req.params.id);
  res.status(204).end();
}));

// ----- Tổng quan: các con số và danh sách cần xử lý, tính một lần -----
router.get('/dashboard', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await getSellerDashboard(pool, seller.id));
}));

// ----- Lịch khởi hành và đánh giá (chỉ đọc) -----
router.get('/departures', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await listSellerDepartures(pool, seller.id, req.query.scope));
}));
router.get('/reviews', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await listSellerReviews(pool, seller.id));
}));

// ----- Booking của khách vào tour của người bán -----
router.get('/bookings', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await listSellerBookings(pool, seller.id, req.query.status));
}));
router.get('/bookings/:id', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await getSellerBooking(pool, seller.id, req.params.id));
}));
router.post('/bookings/:id/confirm', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await confirmSellerBooking(pool, seller.id, req.params.id, req.body?.seller_note));
}));
router.post('/bookings/:id/reject', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await rejectSellerBooking(pool, seller.id, req.params.id, req.body?.seller_note));
}));
router.post('/bookings/:id/complete', wrap(async (req, res) => {
  const { seller } = await requireApprovedSeller(pool, req.headers.authorization);
  res.json(await completeSellerBooking(pool, seller.id, req.params.id));
}));

// Admin: duyệt tour
router.get('/admin/tours', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await listToursForAdmin(pool, req.query.status || 'pending_review'));
}));
router.post('/admin/tours/:id/approve', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await reviewTour(pool, req.params.id, 'approved'));
}));
router.post('/admin/tours/:id/reject', wrap(async (req, res) => {
  await requireUser(pool, req.headers.authorization, 'admin');
  res.json(await reviewTour(pool, req.params.id, 'rejected', req.body?.reason));
}));

router.use(errorHandler);
export default router;
