import { createHmac, timingSafeEqual } from 'node:crypto';

// Token đăng nhập ký ở server, dùng cho /api/seller/*. Hệ thống đăng nhập cũ (POST /api/users/login) không đổi:
// seller đăng nhập bằng /api/seller/login để nhận token này.
const TOKEN_TTL_SECONDS = 7 * 24 * 3600;

function secret() {
  const s = process.env.SELLER_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SELLER_TOKEN_SECRET chưa được đặt (tối thiểu 16 ký tự). Thêm vào GoReady/.env hoặc biến môi trường Vercel.');
  }
  return s;
}

const sign = (body) => createHmac('sha256', secret()).update(body).digest('base64url');

export function signToken(userId) {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Trả về userId nếu token hợp lệ và chưa hết hạn, ngược lại null. */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return typeof uid === 'string' && exp > Date.now() / 1000 ? uid : null;
  } catch {
    return null;
  }
}
