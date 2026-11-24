import { randomUUID } from 'node:crypto';
import { SellerError, requireUser, getSellerByUser, FILE_URL_RE } from './seller.js';

// Tour của người bán. Dùng chính bảng `tours` (người mua đọc bảng này) + 3 bảng phụ
// (tour_itinerary_days, tour_images, tour_departures). Mỗi lần lưu, lịch trình và ảnh được chép sang cột cũ
// `itinerary` / `gallery` để trang người mua hiển thị mà không cần sửa gì.

const REGIONS = ['Việt Nam', 'Quốc tế'];
const GROUP_TAGS = ['Solo', 'Cặp đôi', 'Gia đình', 'Nhóm bạn'];
const HOTEL_STARS = [0, 3, 4, 5];
const STATUSES = ['draft', 'pending_review', 'active', 'rejected', 'hidden'];

/** Chỉ seller đã được duyệt mới dùng được API tour. Trả về { user, seller }. */
export async function requireApprovedSeller(pool, header) {
  const user = await requireUser(pool, header, 'seller');
  const seller = await getSellerByUser(pool, user.id);
  if (!seller) throw new SellerError('Tài khoản này chưa có hồ sơ người bán', 404);
  if (seller.status !== 'approved') throw new SellerError('Hồ sơ người bán chưa được duyệt', 403);
  return { user, seller };
}

const todayVN = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : null);

// ---------- Đọc ----------
export async function getTourFull(pool, tourId, sellerId = null) {
  const { rows } = await pool.query(
    `SELECT t.*, s.business_name AS seller_name FROM tours t LEFT JOIN sellers s ON s.id = t.seller_id
     WHERE t.id = $1 ${sellerId ? 'AND t.seller_id = $2' : 'AND t.seller_id IS NOT NULL'}`,
    sellerId ? [tourId, sellerId] : [tourId],
  );
  const t = rows[0];
  if (!t) return null;
  const [days, images, deps] = await Promise.all([
    pool.query('SELECT day_number, title, description, has_breakfast, has_lunch, has_dinner FROM tour_itinerary_days WHERE tour_id = $1 ORDER BY day_number', [tourId]),
    pool.query('SELECT url FROM tour_images WHERE tour_id = $1 ORDER BY sort_order, id', [tourId]),
    pool.query(
      `SELECT id, to_char(departure_date, 'YYYY-MM-DD') AS departure_date, price, max_seats, booked_seats,
              to_char(booking_deadline, 'YYYY-MM-DD') AS booking_deadline
       FROM tour_departures WHERE tour_id = $1 ORDER BY departure_date, id`,
      [tourId],
    ),
  ]);
  return {
    id: t.id, status: t.status, reject_reason: t.reject_reason, seller_id: t.seller_id, seller_name: t.seller_name,
    name: t.name, destination: t.destination, country: t.country, region: t.region, departure: t.departure,
    transport: t.transport, hotelStars: t.hotelStars, duration: t.duration, nights: t.nights,
    groupSizeTags: t.groupSizeTags ?? [], shortDescription: t.shortDescription, description: t.description,
    coverImage: t.coverImage, images: images.rows.map((r) => r.url),
    itinerary: days.rows, price: t.price, discountPrice: t.discountPrice, childPrice: t.childPrice, departures: deps.rows,
    includes: t.includes ?? [], excludes: t.excludes ?? [], cancellationPolicy: t.cancellationPolicy,
    child_policy: t.child_policy, notes: t.notes, updated_at: t.updated_at,
  };
}

export async function listSellerTours(pool, sellerId, { status, q } = {}) {
  if (status && !STATUSES.includes(status)) throw new SellerError('Trạng thái không hợp lệ');
  const params = [sellerId];
  let where = 't.seller_id = $1';
  if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
  if (str(q)) {
    params.push(`%${str(q).replace(/[\\%_]/g, '\\$&')}%`);
    where += ` AND (t.name ILIKE $${params.length} OR t.destination ILIKE $${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT t.id, t.name, t.destination, t."coverImage", t.departure, t.transport, t."hotelStars", t.price, t.duration, t.nights, t.status, t.reject_reason, t.updated_at,
       (SELECT to_char(MIN(d.departure_date), 'YYYY-MM-DD') FROM tour_departures d WHERE d.tour_id = t.id AND d.departure_date >= CURRENT_DATE) AS next_departure,
       COALESCE((SELECT SUM(d.max_seats) FROM tour_departures d WHERE d.tour_id = t.id AND d.departure_date >= CURRENT_DATE), 0)::int AS max_seats,
       COALESCE((SELECT SUM(d.booked_seats) FROM tour_departures d WHERE d.tour_id = t.id AND d.departure_date >= CURRENT_DATE), 0)::int AS booked_seats
     FROM tours t WHERE ${where} ORDER BY t.updated_at DESC`,
    params,
  );
  const { rows: c } = await pool.query('SELECT status, COUNT(*)::int AS n FROM tours WHERE seller_id = $1 GROUP BY status', [sellerId]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of c) counts[r.status] = r.n;
  return { tours: rows, counts };
}

// ---------- Kiểm tra dữ liệu khi lưu (nhẹ: bản nháp không cần đủ) ----------
function parseInput(input) {
  const f = {};
  const v = {}; // chỉ chứa trường có trong yêu cầu
  const has = (k) => input[k] !== undefined;
  const text = (k, max = 5000) => { if (has(k)) { v[k] = str(input[k]); if (v[k].length > max) f[k] = `Tối đa ${max} ký tự`; } };
  const int = (k, label, { min = 0, max = 1e10, nullable = false } = {}) => {
    if (!has(k)) return;
    if (nullable && (input[k] === null || input[k] === '')) { v[k] = null; return; }
    const n = Number(input[k]);
    if (!Number.isInteger(n) || n < min || n > max) f[k] = `${label} không hợp lệ`;
    else v[k] = n;
  };

  text('name', 200); text('destination', 200); text('country', 100); text('departure', 200); text('transport', 200);
  text('shortDescription', 500); text('description'); text('cancellationPolicy'); text('child_policy'); text('notes');
  text('coverImage', 500);
  if (has('region')) { if (REGIONS.includes(input.region)) v.region = input.region; else f.region = 'Vui lòng chọn Việt Nam hoặc Quốc tế'; }
  if (has('hotelStars')) { const n = Number(input.hotelStars); if (HOTEL_STARS.includes(n)) v.hotelStars = n; else f.hotelStars = 'Số sao khách sạn không hợp lệ'; }
  int('duration', 'Số ngày', { min: 1, max: 60 });
  int('nights', 'Số đêm', { min: 0, max: 60 });
  int('price', 'Giá', { max: 1e9 });
  int('discountPrice', 'Giá khuyến mãi', { max: 1e9, nullable: true });
  int('childPrice', 'Giá trẻ em', { max: 1e9, nullable: true });
  if (has('groupSizeTags')) {
    const l = strList(input.groupSizeTags);
    if (!l || l.some((x) => !GROUP_TAGS.includes(x))) f.groupSizeTags = 'Quy mô đoàn không hợp lệ'; else v.groupSizeTags = [...new Set(l)];
  }
  for (const k of ['includes', 'excludes']) {
    if (!has(k)) continue;
    const l = strList(input[k]);
    if (!l || l.length > 100) f[k] = 'Danh sách không hợp lệ'; else v[k] = l;
  }
  if (has('images')) {
    const l = strList(input.images);
    if (!l || l.length > 20) f.images = 'Tối đa 20 ảnh'; else v.images = l;
  }
  if (has('itinerary')) {
    if (!Array.isArray(input.itinerary) || input.itinerary.length > 60) f.itinerary = 'Lịch trình không hợp lệ';
    else {
      v.itinerary = input.itinerary.map((d, i) => ({
        day_number: i + 1, // luôn đánh số lại 1..n theo thứ tự
        title: str(d?.title), description: str(d?.description),
        has_breakfast: !!d?.has_breakfast, has_lunch: !!d?.has_lunch, has_dinner: !!d?.has_dinner,
      }));
    }
  }
  if (has('departures')) {
    if (!Array.isArray(input.departures) || input.departures.length > 200) f.departures = 'Lịch khởi hành không hợp lệ';
    else {
      v.departures = input.departures.map((d, i) => {
        const out = {
          id: Number.isInteger(d?.id) ? d.id : null,
          departure_date: str(d?.departure_date),
          price: d?.price === null || d?.price === undefined || d?.price === '' ? null : Number(d.price),
          max_seats: d?.max_seats === '' || d?.max_seats === undefined || d?.max_seats === null ? null : Number(d.max_seats),
          booking_deadline: str(d?.booking_deadline) || null,
        };
        if (!isDate(out.departure_date)) f[`departures[${i}].departure_date`] = 'Ngày khởi hành không hợp lệ';
        if (out.price !== null && (!Number.isInteger(out.price) || out.price < 0)) f[`departures[${i}].price`] = 'Giá riêng không hợp lệ';
        if (out.max_seats !== null && (!Number.isInteger(out.max_seats) || out.max_seats < 0)) f[`departures[${i}].max_seats`] = 'Số chỗ không hợp lệ';
        if (out.booking_deadline && (!isDate(out.booking_deadline) || out.booking_deadline > out.departure_date)) {
          f[`departures[${i}].booking_deadline`] = 'Hạn chót phải là ngày hợp lệ, không sau ngày khởi hành';
        }
        return out;
      });
    }
  }
  if (v.duration !== undefined && v.nights !== undefined && v.nights > v.duration) f.nights = 'Số đêm không được lớn hơn số ngày';
  return { v, f };
}

/** Mỗi đường dẫn ảnh phải là ảnh tour do hệ thống cấp (qua POST /api/seller/files, kind = tour_image). */
async function checkImageUrls(pool, urls, field) {
  const ids = [];
  for (const u of urls) {
    const m = u.match(FILE_URL_RE);
    if (!m) return `${field === 'coverImage' ? 'Ảnh bìa' : 'Ảnh'} không hợp lệ, vui lòng tải lại`;
    ids.push(m[1]);
  }
  if (!ids.length) return null;
  const { rows } = await pool.query(`SELECT id FROM seller_files WHERE id = ANY($1) AND kind = 'tour_image'`, [ids]);
  return rows.length === new Set(ids).size ? null : 'Có ảnh không hợp lệ, vui lòng tải lại';
}

/** Kiểm tra đủ điều kiện gửi duyệt, trên dữ liệu tour đã lưu. Trả { trường: thông báo }. */
function validateForSubmit(t) {
  const f = {};
  if (!t.name) f.name = 'Vui lòng nhập tên tour';
  if (!t.destination) f.destination = 'Vui lòng nhập điểm đến';
  if (!t.departure) f.departure = 'Vui lòng nhập điểm khởi hành';
  if (!t.transport) f.transport = 'Vui lòng nhập phương tiện';
  if (!Number.isInteger(t.duration) || t.duration < 1) f.duration = 'Số ngày phải từ 1 trở lên';
  else if (t.itinerary.length !== t.duration) f.itinerary = `Lịch trình có ${t.itinerary.length} ngày nhưng tour dài ${t.duration} ngày`;
  if (!t.coverImage) f.coverImage = 'Vui lòng tải ảnh bìa';
  if (!(t.price > 0)) f.price = 'Giá phải lớn hơn 0';
  const today = todayVN();
  if (!t.departures.some((d) => d.departure_date > today)) f.departures = 'Cần ít nhất 1 ngày khởi hành trong tương lai';
  t.departures.forEach((d, i) => {
    if (!(d.max_seats >= 1)) f[`departures[${i}].max_seats`] = 'Số chỗ tối đa phải từ 1 trở lên';
  });
  return f;
}

// Dấu vết "giá" và "lịch trình" để biết người bán có đổi chúng không (đổi trên tour đang bán thì phải duyệt lại)
const priceSig = (t) => JSON.stringify([t.price ?? null, t.discountPrice ?? null, t.childPrice ?? null,
  (t.departures ?? []).filter((d) => d.price != null).map((d) => [d.departure_date, d.price]).sort()]);
const itinerarySig = (t) => JSON.stringify((t.itinerary ?? []).map((d) => [d.title, d.description, !!d.has_breakfast, !!d.has_lunch, !!d.has_dinner]));

// ---------- Ghi ----------
const SCALAR = {
  name: 'name', destination: 'destination', country: 'country', region: 'region', departure: 'departure', transport: 'transport',
  hotelStars: '"hotelStars"', duration: 'duration', nights: 'nights', shortDescription: '"shortDescription"', description: 'description',
  coverImage: '"coverImage"', price: 'price', discountPrice: '"discountPrice"', childPrice: '"childPrice"',
  cancellationPolicy: '"cancellationPolicy"', child_policy: 'child_policy', notes: 'notes',
};
const JSON_COLS = { groupSizeTags: '"groupSizeTags"', includes: 'includes', excludes: 'excludes' };

export async function createSellerTour(pool, seller, input) {
  const { v, f } = parseInput(input ?? {});
  if (v.images) { const m = await checkImageUrls(pool, v.images, 'images'); if (m) f.images = m; }
  if (v.coverImage) { const m = await checkImageUrls(pool, [v.coverImage], 'coverImage'); if (m) f.coverImage = m; }
  if (Object.keys(f).length) throw new SellerError('Dữ liệu chưa hợp lệ', 422, f);

  const id = `tour-${randomUUID()}`;
  // Chèn thẳng với status 'draft' (không qua createTour) để tour nháp không bao giờ có lúc ở trạng thái 'active'
  await pool.query(
    `INSERT INTO tours (id, slug, name, seller_id, status, region, gallery, itinerary, includes, excludes, reviews, highlights, route,
       "styleTags", "groupSizeTags", rating, "reviewCount", "bookingCount", hidden, "isFeatured", price, duration, nights, "hotelStars")
     VALUES ($1,$1,'',$2,'draft','Việt Nam','[]','[]','[]','[]','[]','[]','[]','[]','[]',0,0,0,FALSE,FALSE,0,1,0,3)`,
    [id, seller.id],
  );
  return saveSellerTour(pool, seller, id, input ?? {});
}

export async function saveSellerTour(pool, seller, tourId, input) {
  const { v, f } = parseInput(input ?? {});
  if (v.images) { const m = await checkImageUrls(pool, v.images, 'images'); if (m) f.images = m; }
  if (v.coverImage) { const m = await checkImageUrls(pool, [v.coverImage], 'coverImage'); if (m) f.coverImage = m; }
  if (Object.keys(f).length) throw new SellerError('Dữ liệu chưa hợp lệ', 422, f);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Khóa dòng tour để hai lần lưu cùng lúc không đè nhau
    const { rows } = await client.query('SELECT status FROM tours WHERE id = $1 AND seller_id = $2 FOR UPDATE', [tourId, seller.id]);
    if (!rows[0]) throw new SellerError('Không tìm thấy tour', 404);
    const status = rows[0].status;
    if (status === 'pending_review') throw new SellerError('Tour đang chờ duyệt, không thể sửa', 409);

    const before = await getTourFull(client, tourId, seller.id);

    const sets = [];
    const vals = [tourId];
    const push = (col, val) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };
    for (const [k, col] of Object.entries(SCALAR)) if (v[k] !== undefined) push(col, v[k]);
    for (const [k, col] of Object.entries(JSON_COLS)) if (v[k] !== undefined) push(col, JSON.stringify(v[k]));

    // Lịch trình: ghi bảng phụ + chép sang cột cũ cho trang người mua
    if (v.itinerary) {
      await client.query('DELETE FROM tour_itinerary_days WHERE tour_id = $1', [tourId]);
      for (const d of v.itinerary) {
        await client.query(
          `INSERT INTO tour_itinerary_days (tour_id, day_number, title, description, has_breakfast, has_lunch, has_dinner)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tourId, d.day_number, d.title, d.description, d.has_breakfast, d.has_lunch, d.has_dinner],
        );
      }
      const legacy = v.itinerary.map((d) => ({
        day: d.day_number,
        title: d.title,
        meals: [d.has_breakfast && 'Sáng', d.has_lunch && 'Trưa', d.has_dinner && 'Tối'].filter(Boolean),
        activities: d.description ? [{ time: '', title: d.title, description: d.description }] : [],
      }));
      push('itinerary', JSON.stringify(legacy));
    }
    if (v.images) {
      await client.query('DELETE FROM tour_images WHERE tour_id = $1', [tourId]);
      for (const [i, url] of v.images.entries()) await client.query('INSERT INTO tour_images (tour_id, url, sort_order) VALUES ($1,$2,$3)', [tourId, url, i]);
      push('gallery', JSON.stringify(v.images));
    }
    if (v.departures) await saveDepartures(client, tourId, before.departures, v.departures);

    // Tour đang bán (active/hidden) mà đổi giá hoặc lịch trình thì phải duyệt lại
    const after = { ...before, ...v };
    let nextStatus = status;
    if ((status === 'active' || status === 'hidden') && (priceSig(before) !== priceSig({ ...after, departures: v.departures ?? before.departures }) || itinerarySig(before) !== itinerarySig(after))) {
      nextStatus = 'pending_review';
      push('status', nextStatus);
      push('reject_reason', null);
    }
    push('updated_at', new Date());
    await client.query(`UPDATE tours SET ${sets.join(', ')} WHERE id = $1`, vals);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getTourFull(pool, tourId, seller.id);
}

// Cập nhật lịch khởi hành, giữ nguyên số chỗ đã đặt; không xóa / giảm dưới số chỗ đã có người đặt
async function saveDepartures(client, tourId, existing, incoming) {
  const byId = new Map(existing.map((d) => [d.id, d]));
  const keep = new Set();
  for (const [i, d] of incoming.entries()) {
    const maxSeats = d.max_seats ?? 0;
    if (d.id !== null) {
      const old = byId.get(d.id);
      if (!old) throw new SellerError('Dữ liệu chưa hợp lệ', 422, { [`departures[${i}]`]: 'Ngày khởi hành không còn tồn tại, vui lòng tải lại trang' });
      if (maxSeats < old.booked_seats) {
        throw new SellerError('Dữ liệu chưa hợp lệ', 422, { [`departures[${i}].max_seats`]: `Đã có ${old.booked_seats} chỗ được đặt, không thể đặt thấp hơn` });
      }
      keep.add(d.id);
      await client.query(
        'UPDATE tour_departures SET departure_date=$2, price=$3, max_seats=$4, booking_deadline=$5 WHERE id=$1 AND tour_id=$6',
        [d.id, d.departure_date, d.price, maxSeats, d.booking_deadline, tourId],
      );
    } else {
      await client.query(
        'INSERT INTO tour_departures (tour_id, departure_date, price, max_seats, booking_deadline) VALUES ($1,$2,$3,$4,$5)',
        [tourId, d.departure_date, d.price, maxSeats, d.booking_deadline],
      );
    }
  }
  for (const old of existing) {
    if (keep.has(old.id)) continue;
    if (old.booked_seats > 0) throw new SellerError('Dữ liệu chưa hợp lệ', 422, { departures: `Ngày ${old.departure_date} đã có người đặt, không thể xóa` });
    await client.query('DELETE FROM tour_departures WHERE id = $1 AND tour_id = $2', [old.id, tourId]);
  }
}

// ---------- Chuyển trạng thái ----------
export async function submitSellerTour(pool, seller, tourId) {
  const tour = await getTourFull(pool, tourId, seller.id);
  if (!tour) throw new SellerError('Không tìm thấy tour', 404);
  if (tour.status !== 'draft' && tour.status !== 'rejected') throw new SellerError('Chỉ tour nháp hoặc bị từ chối mới gửi duyệt được', 409);
  const f = validateForSubmit(tour);
  if (Object.keys(f).length) throw new SellerError('Tour chưa đủ thông tin để gửi duyệt', 422, f);
  const { rowCount } = await pool.query(
    `UPDATE tours SET status = 'pending_review', reject_reason = NULL, updated_at = NOW()
     WHERE id = $1 AND seller_id = $2 AND status IN ('draft', 'rejected')`,
    [tourId, seller.id],
  );
  if (!rowCount) throw new SellerError('Trạng thái tour vừa thay đổi, vui lòng tải lại', 409);
  return getTourFull(pool, tourId, seller.id);
}

/** hide: active → hidden; show: hidden → active. */
export async function setSellerTourVisibility(pool, seller, tourId, hide) {
  const from = hide ? 'active' : 'hidden';
  const { rowCount } = await pool.query(
    'UPDATE tours SET status = $3, updated_at = NOW() WHERE id = $1 AND seller_id = $2 AND status = $4',
    [tourId, seller.id, hide ? 'hidden' : 'active', from],
  );
  if (!rowCount) {
    const { rows } = await pool.query('SELECT 1 FROM tours WHERE id = $1 AND seller_id = $2', [tourId, seller.id]);
    throw rows[0]
      ? new SellerError(hide ? 'Chỉ tour đang bán mới ẩn được' : 'Chỉ tour đang ẩn mới hiện lại được', 409)
      : new SellerError('Không tìm thấy tour', 404);
  }
  return getTourFull(pool, tourId, seller.id);
}

export async function deleteSellerTour(pool, seller, tourId) {
  const { rowCount } = await pool.query(`DELETE FROM tours WHERE id = $1 AND seller_id = $2 AND status = 'draft'`, [tourId, seller.id]);
  if (!rowCount) {
    const { rows } = await pool.query('SELECT 1 FROM tours WHERE id = $1 AND seller_id = $2', [tourId, seller.id]);
    throw rows[0] ? new SellerError('Chỉ được xóa tour nháp', 409) : new SellerError('Không tìm thấy tour', 404);
  }
}

// ---------- Admin ----------
export async function listToursForAdmin(pool, status = 'pending_review') {
  if (!STATUSES.includes(status)) throw new SellerError('Trạng thái không hợp lệ');
  const { rows } = await pool.query(`SELECT id FROM tours WHERE seller_id IS NOT NULL AND status = $1 ORDER BY updated_at`, [status]);
  return Promise.all(rows.map((r) => getTourFull(pool, r.id)));
}

export async function reviewTour(pool, tourId, decision, reason) {
  const text = str(reason);
  if (decision === 'rejected' && !text) throw new SellerError('Vui lòng nhập lý do từ chối', 422, { reason: 'Vui lòng nhập lý do từ chối' });
  const { rowCount } = await pool.query(
    `UPDATE tours SET status = $2, reject_reason = $3, updated_at = NOW()
     WHERE id = $1 AND seller_id IS NOT NULL AND status = 'pending_review'`,
    [tourId, decision === 'approved' ? 'active' : 'rejected', decision === 'rejected' ? text : null],
  );
  if (!rowCount) {
    const { rows } = await pool.query('SELECT 1 FROM tours WHERE id = $1 AND seller_id IS NOT NULL', [tourId]);
    throw rows[0] ? new SellerError('Tour này không còn ở trạng thái chờ duyệt', 409) : new SellerError('Không tìm thấy tour', 404);
  }
  return getTourFull(pool, tourId);
}
