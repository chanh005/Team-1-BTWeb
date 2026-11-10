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
const images = new Map();

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
