import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { SELLER_BUSINESS_TYPES } from './migrations/001_seller_center.js';
import { signToken, verifyToken } from './auth.js';
import { loginUser } from './users.js';

/** Lỗi do dữ liệu gửi lên. `fields` = { tenTruong: 'thông báo' } để giao diện hiện lỗi dưới từng ô. */
export class SellerError extends Error {
  constructor(message, status = 400, fields = undefined) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// ---------- Upload file ----------
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_KINDS = { logo: ['image/jpeg', 'image/png'], tour_image: ['image/jpeg', 'image/png'], business_reg: null, travel_license: null }; // null = JPG/PNG/PDF
const ANY_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Nhận diện loại file bằng nội dung thật (không tin vào phần khai báo của trình duyệt)
function sniffMime(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 4 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png';
  if (buf.length > 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  return null;
}

export const PUBLIC_KINDS = ['logo', 'tour_image']; // ai cũng xem được (hiện ở trang người mua)
export const FILE_URL_RE = /^\/api\/seller\/files\/(sf-[0-9a-f-]{36})$/;

export async function saveSellerFile(pool, kind, dataUrl) {
  if (typeof kind !== 'string' || !Object.hasOwn(FILE_KINDS, kind)) throw new SellerError('Loại file không hợp lệ');
  const m = typeof dataUrl === 'string' ? dataUrl.match(/^data:[\w/+.-]+;base64,([A-Za-z0-9+/=\r\n]+)$/) : null;
  if (!m) throw new SellerError('File không hợp lệ');
  const data = Buffer.from(m[1], 'base64');
  if (data.length === 0) throw new SellerError('File không hợp lệ');
  if (data.length > MAX_FILE_BYTES) throw new SellerError('File quá lớn (tối đa 10MB)', 413);
  const mime = sniffMime(data);
  const allowed = FILE_KINDS[kind] ?? ANY_TYPES;
  if (!mime || !allowed.includes(mime)) {
    throw new SellerError(kind === 'logo' || kind === 'tour_image' ? 'Ảnh chỉ nhận JPG hoặc PNG' : 'Chỉ nhận file JPG, PNG hoặc PDF');
  }
  const id = `sf-${randomUUID()}`;
  await pool.query('INSERT INTO seller_files (id, kind, mime, data) VALUES ($1,$2,$3,$4)', [id, kind, mime, data]);
  return { id, url: `/api/seller/files/${id}` };
}

/** Lấy file. Logo công khai; giấy phép chỉ chủ hồ sơ hoặc admin xem được (`viewer` = user đã đăng nhập hoặc null). */
export async function getSellerFile(pool, id, viewer) {
  const { rows } = await pool.query('SELECT kind, mime, data FROM seller_files WHERE id = $1', [id]);
  const f = rows[0];
  if (!f) throw new SellerError('Không tìm thấy file', 404);
  if (!PUBLIC_KINDS.includes(f.kind)) {
    if (!viewer) throw new SellerError('Cần đăng nhập', 401);
    if (viewer.role !== 'admin') {
      const { rows: own } = await pool.query(
        'SELECT 1 FROM sellers WHERE user_id = $1 AND (business_reg_file = $2 OR travel_license_file = $2)',
        [viewer.id, `/api/seller/files/${id}`],
      );
      if (!own[0]) throw new SellerError('Không có quyền xem file này', 403);
    }
  }
  return { kind: f.kind, mime: f.mime, data: Buffer.from(f.data) };
}

// ---------- Xác thực ----------
export async function userFromAuthHeader(pool, header) {
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  const uid = verifyToken(token);
  if (!uid) return null;
  const { rows } = await pool.query('SELECT id, name, email, phone, role, status FROM users WHERE id = $1', [uid]);
  const u = rows[0];
  return u && u.status !== 'locked' ? u : null; // vai trò & khóa tài khoản luôn lấy mới từ DB
}

export async function requireUser(pool, header, role) {
  const user = await userFromAuthHeader(pool, header);
  if (!user) throw new SellerError('Chưa đăng nhập hoặc phiên đã hết hạn', 401);
  if (role && user.role !== role) throw new SellerError('Không có quyền truy cập', 403);
  return user;
}

// ---------- Kiểm tra dữ liệu ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v) => (typeof v === 'string' ? v.trim() : '');
const digits = (v) => s(v).replace(/[\s.\-()]/g, '');

/** Kiểm tra phần hồ sơ doanh nghiệp (dùng chung cho đăng ký và sửa lại). */
async function validateProfile(pool, input, excludeSellerId) {
  const f = {};
  const v = {
    business_name: s(input.business_name),
    tax_code: digits(input.tax_code),
    business_type: s(input.business_type),
    legal_representative: s(input.legal_representative),
    address: s(input.address),
    hotline: digits(input.hotline),
    website: s(input.website) || null,
    logo_url: s(input.logo_url) || null,
    travel_license_number: s(input.travel_license_number) || null,
    travel_license_issued_at: s(input.travel_license_issued_at) || null,
    business_reg_file: s(input.business_reg_file) || null,
    travel_license_file: s(input.travel_license_file) || null,
  };

  if (!v.business_name) f.business_name = 'Vui lòng nhập tên doanh nghiệp';
  if (!/^(\d{10}|\d{13})$/.test(v.tax_code)) f.tax_code = 'Mã số doanh nghiệp gồm 10 hoặc 13 chữ số';
  if (!SELLER_BUSINESS_TYPES.includes(v.business_type)) f.business_type = 'Vui lòng chọn loại hình';
  if (!v.legal_representative) f.legal_representative = 'Vui lòng nhập tên người đại diện pháp luật';
  if (!v.address) f.address = 'Vui lòng nhập địa chỉ trụ sở';
  if (!/^\+?\d{4,15}$/.test(v.hotline)) f.hotline = 'Hotline không hợp lệ';
  if (v.website && !/^https?:\/\/\S+\.\S+$/i.test(v.website)) f.website = 'Website phải bắt đầu bằng http:// hoặc https://';

  // File: chỉ chấp nhận đường dẫn do chính hệ thống cấp, đúng loại
  const checkFile = async (key, kind, msg) => {
    if (!v[key]) return;
    const m = v[key].match(FILE_URL_RE);
    const { rows } = m ? await pool.query('SELECT kind FROM seller_files WHERE id = $1', [m[1]]) : { rows: [] };
    if (!rows[0] || rows[0].kind !== kind) f[key] = msg;
  };
  await checkFile('logo_url', 'logo', 'Logo không hợp lệ, vui lòng tải lại');
  await checkFile('business_reg_file', 'business_reg', 'File không hợp lệ, vui lòng tải lại');
  await checkFile('travel_license_file', 'travel_license', 'File không hợp lệ, vui lòng tải lại');
  if (!v.business_reg_file) f.business_reg_file = 'Vui lòng tải lên giấy đăng ký kinh doanh';

  // Giấy phép lữ hành: chỉ bắt buộc với doanh nghiệp lữ hành (nội địa / quốc tế)
  if (v.business_type === 'domestic_travel' || v.business_type === 'international_travel') {
    if (!v.travel_license_number) f.travel_license_number = 'Vui lòng nhập số giấy phép kinh doanh lữ hành';
    if (!v.travel_license_file) f.travel_license_file = 'Vui lòng tải lên giấy phép kinh doanh lữ hành';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.travel_license_issued_at ?? '') || Number.isNaN(Date.parse(v.travel_license_issued_at))) {
      f.travel_license_issued_at = 'Vui lòng chọn ngày cấp hợp lệ';
    } else if (Date.parse(v.travel_license_issued_at) > Date.now()) {
      f.travel_license_issued_at = 'Ngày cấp không được ở tương lai';
    }
  } else if (v.travel_license_issued_at && (!/^\d{4}-\d{2}-\d{2}$/.test(v.travel_license_issued_at) || Number.isNaN(Date.parse(v.travel_license_issued_at)))) {
    f.travel_license_issued_at = 'Ngày cấp không hợp lệ';
  }

  if (!f.tax_code) {
    const { rows } = await pool.query('SELECT id FROM sellers WHERE tax_code = $1 AND id <> $2', [v.tax_code, excludeSellerId ?? '']);
    if (rows[0]) f.tax_code = 'Mã số doanh nghiệp này đã được đăng ký';
  }
  return { v, f };
}

const isDuplicate = (f) => Object.values(f).some((m) => m.includes('đã được'));

// ---------- Đăng ký / hồ sơ ----------
function publicSeller(row) {
  if (!row) return null;
  const d = row.travel_license_issued_at;
  // pg trả DATE là Date theo giờ máy chủ: lấy ngày/tháng/năm địa phương để không lệch ngày
  const ymd = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return {
    ...row,
    travel_license_issued_at: d ? (d instanceof Date ? ymd(d) : String(d).slice(0, 10)) : null,
  };
}

export async function getSellerByUser(pool, userId) {
  const { rows } = await pool.query('SELECT * FROM sellers WHERE user_id = $1', [userId]);
  return publicSeller(rows[0]);
}

export async function registerSeller(pool, input) {
  const email = s(input.email);
  const phone = digits(input.phone);
  const password = typeof input.password === 'string' ? input.password : '';

  const { v, f } = await validateProfile(pool, input, null);
  if (!EMAIL_RE.test(email)) f.email = 'Email không hợp lệ';
  if (!/^(\+?84|0)\d{8,10}$/.test(phone)) f.phone = 'Số điện thoại không hợp lệ';
  if (password.length < 8) f.password = 'Mật khẩu tối thiểu 8 ký tự';
  if (input.password_confirm !== password) f.password_confirm = 'Mật khẩu nhập lại không khớp';
  if (!f.email) {
    const { rows } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
    if (rows[0]) f.email = 'Email này đã được sử dụng';
  }
  if (Object.keys(f).length) throw new SellerError('Dữ liệu chưa hợp lệ', isDuplicate(f) ? 409 : 422, f);

  const hash = await bcrypt.hash(password, 10);
  const userId = `usr-${randomUUID()}`;
  const sellerId = `sel-${randomUUID()}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, name, email, phone, "joinedAt", "totalBookings", status, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,0,'active',$6,'seller')`,
      [userId, v.legal_representative, email, phone, new Date().toISOString().slice(0, 10), hash],
    );
    await client.query(
      `INSERT INTO sellers (id, user_id, business_name, tax_code, business_type, legal_representative, address, hotline, website,
         logo_url, travel_license_number, travel_license_issued_at, business_reg_file, travel_license_file)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [sellerId, userId, v.business_name, v.tax_code, v.business_type, v.legal_representative, v.address, v.hotline, v.website,
        v.logo_url, v.travel_license_number, v.travel_license_issued_at, v.business_reg_file, v.travel_license_file],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const msg = 'Email hoặc mã số doanh nghiệp đã được sử dụng';
      throw new SellerError(msg, 409, { email: msg });
    }
    throw err;
  } finally {
    client.release();
  }
  return { token: signToken(userId), seller: await getSellerByUser(pool, userId) };
}

export async function loginSeller(pool, email, password) {
  let user;
  try {
    user = await loginUser(pool, s(email), typeof password === 'string' ? password : '');
  } catch (err) {
    if (err.status === 401) throw new SellerError('Email hoặc mật khẩu không đúng', 401);
    if (err.status === 403) throw new SellerError('Tài khoản đã bị khóa', 403);
    throw err;
  }
  if (user.role !== 'seller' && user.role !== 'admin') throw new SellerError('Tài khoản này không phải tài khoản người bán', 403);
  return {
    token: signToken(user.id),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    seller: await getSellerByUser(pool, user.id),
  };
}

/** Sửa hồ sơ: chỉ khi đang rejected. Gửi lại thì về pending và xóa lý do từ chối. */
export async function resubmitSeller(pool, userId, input) {
  const current = await getSellerByUser(pool, userId);
  if (!current) throw new SellerError('Không tìm thấy hồ sơ người bán', 404);
  if (current.status !== 'rejected') throw new SellerError('Chỉ được sửa hồ sơ khi hồ sơ bị từ chối', 409);

  const { v, f } = await validateProfile(pool, input, current.id);
  if (Object.keys(f).length) throw new SellerError('Dữ liệu chưa hợp lệ', isDuplicate(f) ? 409 : 422, f);

  const { rows } = await pool.query(
    `UPDATE sellers SET business_name=$2, tax_code=$3, business_type=$4, legal_representative=$5, address=$6, hotline=$7, website=$8,
       logo_url=$9, travel_license_number=$10, travel_license_issued_at=$11, business_reg_file=$12, travel_license_file=$13,
       status='pending', reject_reason=NULL
     WHERE id=$1 AND status='rejected' RETURNING *`,
    [current.id, v.business_name, v.tax_code, v.business_type, v.legal_representative, v.address, v.hotline, v.website,
      v.logo_url, v.travel_license_number, v.travel_license_issued_at, v.business_reg_file, v.travel_license_file],
  );
  if (!rows[0]) throw new SellerError('Hồ sơ vừa được thay đổi, vui lòng tải lại trang', 409);
  return publicSeller(rows[0]);
}

// ---------- Admin ----------
export async function listSellersForAdmin(pool, status = 'pending') {
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new SellerError('Trạng thái không hợp lệ');
  const { rows } = await pool.query(
    `SELECT s.*, u.email, u.phone FROM sellers s JOIN users u ON u.id = s.user_id WHERE s.status = $1 ORDER BY s.created_at`,
    [status],
  );
  return rows.map(publicSeller);
}

export async function reviewSeller(pool, sellerId, decision, reason) {
  const text = s(reason);
  if (decision === 'rejected' && !text) throw new SellerError('Vui lòng nhập lý do từ chối', 422, { reason: 'Vui lòng nhập lý do từ chối' });
  const { rows } = await pool.query(
    `UPDATE sellers SET status = $2, reject_reason = $3 WHERE id = $1 AND status = 'pending' RETURNING *`,
    [sellerId, decision, decision === 'rejected' ? text : null],
  );
  if (!rows[0]) {
    const { rows: ex } = await pool.query('SELECT status FROM sellers WHERE id = $1', [sellerId]);
    throw ex[0] ? new SellerError('Hồ sơ này không còn ở trạng thái chờ duyệt', 409) : new SellerError('Không tìm thấy hồ sơ', 404);
  }
  return publicSeller(rows[0]);
}
