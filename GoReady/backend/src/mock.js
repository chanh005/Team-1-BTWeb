// Backend GIẢ LẬP để chạy thử giao diện khi chưa có Postgres/Neon (`npm run dev:mock`).
// Cùng cổng 4000 và cùng đường dẫn /api/* với backend thật, nên frontend không phải đổi gì.
// Dữ liệu lấy từ lib/seed-data/*.json và chỉ nằm trong bộ nhớ: tắt server là mất mọi thay đổi.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import cors from 'cors';
import express from 'express';
import { ImageError, decodeDataUrl } from '../../lib/images.js';

const seedDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'lib', 'seed-data');
const seed = (name) => JSON.parse(readFileSync(join(seedDir, `${name}.json`), 'utf-8'));

let tours = seed('tours');
let bookings = seed('bookings');
let users = seed('users');
let articles = [];
const images = new Map();

// Giống ensureAdminAccount trong lib/schema.js
users.push({
  id: 'usr-admin', name: 'Quản trị viên', email: 'admin@goready.vn', phone: '', joinedAt: new Date().toISOString().slice(0, 10),
  totalBookings: 0, status: 'active', role: 'admin', password_hash: bcrypt.hashSync('GoReady@2025!', 10),
});

// Cột của tour chỉ có ở tour nhập từ Google Sheet: bỏ khỏi JSON khi rỗng (giống lib/tours.js)
const SHEET_FIELDS = ['code', 'durationLabel', 'childPrice', 'category', 'keywords'];
const serializeTour = (tour) => {
  const out = { ...tour };
  for (const f of SHEET_FIELDS) if (out[f] === null || out[f] === undefined) delete out[f];
  return out;
};
const publicUser = ({ password_hash, ...safe }) => safe;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'mock' }));

// Không có bảng suggested_tours: 503 để frontend tự dùng Google Sheet / public/data/suggested-tours.csv
app.use('/api/suggested-tours', (_req, res) => res.status(503).json({ error: 'Mock backend: dùng dữ liệu CSV/Google Sheets' }));

// --- Tours ---
app.get('/api/tours', (_req, res) => {
  res.json([...tours].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map(serializeTour));
});

app.post('/api/tours', (req, res) => {
  const id = req.body.id || `tour-${randomUUID()}`;
  const tour = {
    slug: id, region: 'Việt Nam', gallery: [], price: 0, duration: 1, nights: 0, hotelStars: 3, styleTags: [], groupSizeTags: [],
    rating: 0, reviewCount: 0, bookingCount: 0, itinerary: [], includes: [], excludes: [], reviews: [], highlights: [], route: [],
    cancellationPolicy: 'Hoàn 100% nếu huỷ trước 7 ngày khởi hành.', hidden: false, isFeatured: false,
    ...req.body,
    id,
  };
  tours.push(tour);
  res.status(201).json(serializeTour(tour));
});

app.put('/api/tours/:id', (req, res) => {
  const i = tours.findIndex((t) => t.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Tour not found' });
  tours[i] = { ...tours[i], ...req.body, id: req.params.id };
  res.json(serializeTour(tours[i]));
});

app.patch('/api/tours/:id/hidden', (req, res) => {
  const tour = tours.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  tour.hidden = !tour.hidden;
  res.json(serializeTour(tour));
});

app.delete('/api/tours/:id', (req, res) => {
  tours = tours.filter((t) => t.id !== req.params.id);
  res.status(204).end();
});

// --- Articles (Bảng tin) --- (same rules as lib/articles.js)
let comments = []; // { id, articleId, userId, content, hidden, createdAt }
let ratings = []; // { articleId, userId, rating, createdAt }

const ratingSummary = (articleId, userId) => {
  const list = ratings.filter((r) => r.articleId === articleId);
  const ratingAvg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  const myRating = list.find((r) => r.userId === userId)?.rating ?? null;
  return { ratingAvg, ratingCount: list.length, myRating };
};
const withStats = (a) => {
  const { ratingAvg, ratingCount } = ratingSummary(a.id);
  return { ...a, ratingAvg, ratingCount, commentCount: comments.filter((c) => c.articleId === a.id && !c.hidden).length };
};
const withAuthor = (c) => ({
  ...c,
  userName: users.find((u) => u.id === c.userId)?.name ?? null,
  userRating: ratings.find((r) => r.articleId === c.articleId && r.userId === c.userId)?.rating ?? null,
  articleTitle: articles.find((a) => a.id === c.articleId)?.title ?? null,
});
const publishDate = (a) => String(a.publishAt ?? a.createdAt);
const isPublic = (a, now) => !a.hidden && a.status === 'published' && (!a.publishAt || a.publishAt <= now);
// Không cho PUT ghi đè lượt xem / số liệu tổng hợp
const ARTICLE_READONLY = ['views', 'ratingAvg', 'ratingCount', 'commentCount'];
const withoutReadonly = (body) => Object.fromEntries(Object.entries(body).filter(([k]) => !ARTICLE_READONLY.includes(k)));
// Mirrors requireActiveUser/requireArticle in lib/articles.js; answers the request and returns false on failure
const checkFeedback = (req, res, userId) => {
  if (!articles.some((a) => a.id === req.params.id)) return res.status(404).json({ error: 'Article not found' }) && false;
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' }) && false;
  if (user.status === 'locked') return res.status(403).json({ error: 'locked' }) && false;
  return true;
};

app.get('/api/articles', (req, res) => {
  const now = new Date().toISOString();
  const list = req.query.public === '1' ? articles.filter((a) => isPublic(a, now)) : articles;
  res.json(
    list
      .map(withStats)
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || publishDate(b).localeCompare(publishDate(a)))
  );
});

app.post('/api/articles', (req, res) => {
  const id = req.body.id || `article-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const article = {
    slug: id, title: '', category: 'Tin tức', coverImage: '', excerpt: '', content: '', author: '', hidden: false,
    createdAt, status: 'published', publishAt: createdAt, pinned: false, relatedTourIds: [],
    ...withoutReadonly(req.body),
    views: 0,
    id,
  };
  articles.push(article);
  res.status(201).json(withStats(article));
});

app.put('/api/articles/:id', (req, res) => {
  const i = articles.findIndex((a) => a.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Article not found' });
  articles[i] = { ...articles[i], ...withoutReadonly(req.body), id: req.params.id };
  res.json(withStats(articles[i]));
});

app.patch('/api/articles/:id/hidden', (req, res) => {
  const article = articles.find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  article.hidden = !article.hidden;
  res.json(withStats(article));
});

app.delete('/api/articles/:id', (req, res) => {
  articles = articles.filter((a) => a.id !== req.params.id);
  comments = comments.filter((c) => c.articleId !== req.params.id);
  ratings = ratings.filter((r) => r.articleId !== req.params.id);
  res.status(204).end();
});

app.post('/api/articles/:id/view', (req, res) => {
  const article = articles.find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  article.views = (article.views ?? 0) + 1;
  res.json({ views: article.views });
});

app.get('/api/articles/:id/comments', (req, res) => {
  if (!articles.some((a) => a.id === req.params.id)) return res.status(404).json({ error: 'Article not found' });
  const list = comments
    .filter((c) => c.articleId === req.params.id && !c.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(withAuthor);
  res.json({ comments: list, ...ratingSummary(req.params.id, req.query.userId) });
});

app.post('/api/articles/:id/comments', (req, res) => {
  const content = String(req.body?.content ?? '').trim();
  if (!content) return res.status(400).json({ error: 'Nội dung bình luận không được để trống' });
  if (content.length > 1000) return res.status(400).json({ error: 'Bình luận tối đa 1000 ký tự' });
  if (!checkFeedback(req, res, req.body?.userId)) return;
  const comment = { id: `cmt-${randomUUID()}`, articleId: req.params.id, userId: req.body.userId, content, hidden: false, createdAt: new Date().toISOString() };
  comments.push(comment);
  res.status(201).json(withAuthor(comment));
});

app.put('/api/articles/:id/rating', (req, res) => {
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Điểm đánh giá phải từ 1 đến 5' });
  const { userId } = req.body;
  if (!checkFeedback(req, res, userId)) return;
  ratings = ratings.filter((r) => !(r.articleId === req.params.id && r.userId === userId));
  ratings.push({ articleId: req.params.id, userId, rating, createdAt: new Date().toISOString() });
  res.json(ratingSummary(req.params.id, userId));
});

app.get('/api/comments', (_req, res) => {
  res.json([...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withAuthor));
});

app.patch('/api/comments/:id', (req, res) => {
  const comment = comments.find((c) => c.id === req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  comment.hidden = Boolean(req.body?.hidden);
  res.json(withAuthor(comment));
});

app.delete('/api/comments/:id', (req, res) => {
  comments = comments.filter((c) => c.id !== req.params.id);
  res.status(204).end();
});

// --- Bookings ---
app.get('/api/bookings', (_req, res) => {
  res.json([...bookings].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
});

app.post('/api/bookings', (req, res) => {
  const booking = { ...req.body, id: req.body.id || `booking-${randomUUID()}`, addOns: req.body.addOns ?? [], note: req.body.note ?? null };
  bookings.push(booking);
  const owner = users.find((u) => u.email.toLowerCase() === String(booking.contactEmail).toLowerCase());
  if (owner) owner.totalBookings += 1;
  res.status(201).json(booking);
});

app.patch('/api/bookings/:id/status', (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  booking.status = req.body.status;
  res.json(booking);
});

// --- Users ---
app.get('/api/users', (_req, res) => {
  res.json([...users].sort((a, b) => String(b.joinedAt).localeCompare(String(a.joinedAt))).map(publicUser));
});

app.post('/api/users/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'email_taken' });
  const user = {
    id: `usr-${randomUUID()}`, name, email, phone: '', joinedAt: new Date().toISOString().slice(0, 10), totalBookings: 0,
    status: 'active', role: 'user', password_hash: await bcrypt.hash(password, 10),
  };
  users.push(user);
  res.status(201).json(publicUser(user));
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  if (user.status === 'locked') return res.status(403).json({ error: 'locked' });
  // Tài khoản demo trong seed không có mật khẩu: nhập gì cũng vào được (giống backend thật)
  if (user.password_hash && !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'invalid_credentials' });
  res.json(publicUser(user));
});

app.patch('/api/users/:id/avatar', (req, res) => {
  const { avatar } = req.body;
  if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) return res.status(400).json({ error: 'avatar must be an image data URL' });
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.avatar = avatar;
  res.json(publicUser(user));
});

app.patch('/api/users/:id/status', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = user.status === 'active' ? 'locked' : 'active';
  res.json(publicUser(user));
});

// --- Images (ảnh tour tải lên từ trang admin) ---
app.post('/api/images', (req, res) => {
  try {
    const { mime, data } = decodeDataUrl(req.body?.dataUrl);
    const id = `img-${randomUUID()}`;
    images.set(id, { mime, data });
    res.status(201).json({ id, url: `/api/images/${id}` });
  } catch (err) {
    if (err instanceof ImageError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

app.get('/api/images/:id', (req, res) => {
  const image = images.get(req.params.id);
  if (!image) return res.status(404).json({ error: 'Image not found' });
  res.set({ 'Content-Type': image.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(image.data);
});

// --- Ngày khởi hành: số chỗ tối đa / còn lại và giữ chỗ ---
// Frontend tự dựng lịch đoàn; backend ghi nhận {maxSeats, availableSeats} ở lần đầu thấy mỗi ngày khởi hành (id)
// rồi là nguồn sự thật: hold → commit trừ availableSeats, return trả chỗ lại. Mỗi ngày chỉ một người giữ chỗ tại một thời điểm.
const HOLD_MS = 10 * 60 * 1000;
const departures = new Map(); // id -> { id, maxSeats, availableSeats, hold: { holderId, seats, expiresAt } | null }

const activeHold = (d) => {
  if (d.hold && d.hold.expiresAt <= Date.now()) d.hold = null;
  return d.hold;
};

const seatView = (d, clientId) => {
  const hold = activeHold(d);
  const heldByMe = hold?.holderId === clientId;
  const status = d.availableSeats === 0 ? 'sold-out' : hold && !heldByMe ? 'holding' : 'available';
  return {
    id: d.id, maxSeats: d.maxSeats, availableSeats: d.availableSeats, status, heldByMe,
    ...(hold ? { holdRemainingMs: hold.expiresAt - Date.now() } : {}),
  };
};

const isCount = (n) => Number.isInteger(n) && n >= 0 && n <= 10000;

app.get('/api/departures', (_req, res) => {
  res.json([...departures.values()].map((d) => seatView(d, '')));
});

app.post('/api/departures/sync', (req, res) => {
  const { clientId, departures: list } = req.body ?? {};
  if (typeof clientId !== 'string' || !Array.isArray(list) || list.length > 200) return res.status(400).json({ error: 'clientId and departures[] are required' });
  const views = [];
  for (const item of list) {
    if (typeof item?.id !== 'string' || !isCount(item.maxSeats) || !isCount(item.availableSeats)) return res.status(400).json({ error: 'invalid departure' });
    if (!departures.has(item.id)) {
      departures.set(item.id, { id: item.id, maxSeats: item.maxSeats, availableSeats: Math.min(item.availableSeats, item.maxSeats), hold: null });
    }
    views.push(seatView(departures.get(item.id), clientId));
  }
  res.json(views);
});

const withDeparture = (handler) => (req, res) => {
  const d = departures.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Departure not found' });
  return handler(d, req.body ?? {}, res);
};

// Khách vào bước thanh toán: khóa cả ngày khởi hành cho riêng họ
app.post('/api/departures/:id/hold', withDeparture((d, { clientId, seats }, res) => {
  if (typeof clientId !== 'string' || !Number.isInteger(seats) || seats < 1) return res.status(400).json({ error: 'clientId and seats are required' });
  const hold = activeHold(d);
  if (d.availableSeats === 0) return res.json({ ok: false, reason: 'sold-out' });
  if (hold && hold.holderId !== clientId) return res.json({ ok: false, reason: 'held' });
  if (seats > d.availableSeats) return res.json({ ok: false, reason: 'not-enough' });
  d.hold = { holderId: clientId, seats, expiresAt: Date.now() + HOLD_MS };
  res.json({ ok: true, ttlMs: HOLD_MS });
}));

app.post('/api/departures/:id/release', withDeparture((d, { clientId }, res) => {
  if (activeHold(d)?.holderId === clientId) d.hold = null;
  res.json({ ok: true });
}));

// Thanh toán thành công: trừ chỗ của đúng ngày khởi hành này, chỉ khi lượt giữ chỗ vẫn là của khách
app.post('/api/departures/:id/commit', withDeparture((d, { clientId, seats }, res) => {
  const hold = activeHold(d);
  if (!hold || hold.holderId !== clientId || !Number.isInteger(seats) || seats < 1 || seats > d.availableSeats) return res.json({ ok: false });
  d.availableSeats -= seats;
  d.hold = null;
  res.json({ ok: true, availableSeats: d.availableSeats });
}));

// Hủy booking: trả chỗ về (không vượt quá maxSeats)
app.post('/api/departures/:id/return', withDeparture((d, { seats }, res) => {
  if (!Number.isInteger(seats) || seats < 1) return res.status(400).json({ error: 'seats is required' });
  d.availableSeats = Math.min(d.maxSeats, d.availableSeats + seats);
  res.json({ ok: true, availableSeats: d.availableSeats });
}));

app.use((err, _req, res, _next) => {
  console.error('[mock-api]', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
});

app.listen(PORT, () => {
  console.log(`GoReady MOCK backend (dữ liệu mẫu trong bộ nhớ, không cần database) listening on http://localhost:${PORT}`);
});
