import { createHash, randomUUID } from 'node:crypto';

// "Chuyến đi của tôi": ChuyenDi, LichTrinhChuyenDi, Ve, KhachSan and DiaDiem.
//
// DonDatTour is the existing `bookings` table (MaDon = bookings.id). A ChuyenDi row is generated (1-1 via "maDon") only
// for an order whose payment succeeded; the checkout only creates a booking once payment is done, so any status in
// PAID_STATUSES qualifies, while unpaid / pending / failed orders never get a trip and are never listed.

export const PAID_STATUSES = ['upcoming', 'confirmed', 'completed', 'cancelled'];

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS dia_diem (
    "maDiaDiem" TEXT PRIMARY KEY,
    "tenDiaDiem" TEXT NOT NULL,
    "loaiDiaDiem" TEXT,
    "diaChi" TEXT,
    "viDo" DOUBLE PRECISION,
    "kinhDo" DOUBLE PRECISION
  );

  CREATE TABLE IF NOT EXISTS khach_san (
    "maKhachSan" TEXT PRIMARY KEY,
    "tenKhachSan" TEXT NOT NULL,
    "diaChi" TEXT,
    "hangSao" INTEGER,
    "maDiaDiem" TEXT REFERENCES dia_diem ("maDiaDiem")
  );

  CREATE TABLE IF NOT EXISTS chuyen_di (
    "maChuyenDi" TEXT PRIMARY KEY,
    "maDon" TEXT NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
    "tenChuyenDi" TEXT,
    "diemDen" TEXT,
    "anhBia" TEXT,
    "ngayKhoiHanh" TEXT NOT NULL,
    "gioKhoiHanh" TEXT,
    "ngayKetThuc" TEXT,
    "soNgay" INTEGER,
    "soDem" INTEGER,
    "phuongTien" TEXT,
    "diemDon" TEXT,
    "gioDon" TEXT,
    "tenHDV" TEXT,
    "sdtHDV" TEXT,
    "maKhachSan" TEXT REFERENCES khach_san ("maKhachSan"),
    "ngayNhanPhong" TEXT,
    "ngayTraPhong" TEXT,
    "ngayTao" TEXT
  );

  CREATE TABLE IF NOT EXISTS lich_trinh_chuyen_di (
    "maLichTrinh" TEXT PRIMARY KEY,
    "maChuyenDi" TEXT NOT NULL REFERENCES chuyen_di ("maChuyenDi") ON DELETE CASCADE,
    "ngayThu" INTEGER NOT NULL,
    ngay TEXT,
    gio TEXT,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "maDiaDiem" TEXT REFERENCES dia_diem ("maDiaDiem"),
    "thuTu" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ve (
    "maVe" TEXT PRIMARY KEY,
    "maChuyenDi" TEXT NOT NULL REFERENCES chuyen_di ("maChuyenDi") ON DELETE CASCADE,
    "loaiVe" TEXT NOT NULL,
    "tenVe" TEXT NOT NULL,
    "maDatVe" TEXT NOT NULL,
    "maQR" TEXT NOT NULL,
    "giaVe" INTEGER,
    "thuTu" INTEGER NOT NULL
  );
`;

let ensured = false;

export async function ensureChuyenDiSchema(pool) {
  if (ensured) return;
  await pool.query(CREATE_SQL);
  ensured = true;
}

// ---------------------------------------------------------------------------------------------------------------------
// Building a trip from a paid order (pure: no database access, so it can be unit-tested)
// ---------------------------------------------------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const shortHash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16);
const asText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** A deterministic id, so the same place used by several trips is stored once. */
const diaDiemId = (ten, lat, lng) => `dd-${shortHash(`${ten}|${lat ?? ''}|${lng ?? ''}`)}`;

function makeDiaDiem(ten, loai, lat, lng, diaChi = null) {
  const viDo = Number.isFinite(lat) ? lat : null;
  const kinhDo = Number.isFinite(lng) ? lng : null;
  return { maDiaDiem: diaDiemId(ten, viDo, kinhDo), tenDiaDiem: ten, loaiDiaDiem: loai ?? null, diaChi, viDo, kinhDo };
}

/**
 * @param booking a paid `bookings` row
 * @param tour    the matching `tours` row, or undefined when the tour has since been deleted
 * Returns null when the order has no usable departure date.
 */
export function buildChuyenDi(booking, tour) {
  const ngayKhoiHanh = String(booking.departureDate ?? '').slice(0, 10);
  if (!DATE_RE.test(ngayKhoiHanh)) return null;

  const itinerary = Array.isArray(tour?.itinerary) ? tour.itinerary : [];
  const soNgay = Math.max(1, Number(tour?.duration) || itinerary.length || 1);
  const soDem = Number.isFinite(Number(tour?.nights)) && tour?.nights != null ? Math.max(0, Number(tour.nights)) : soNgay - 1;
  const ngayKetThuc = addDays(ngayKhoiHanh, soNgay - 1);

  const maChuyenDi = `cd-${randomUUID()}`;
  const tenChuyenDi = asText(tour?.name) ?? 'Chuyến đi GoReady';
  const gioDon = asText(booking.pickupTime) ?? '06:30';
  const diemDon = asText(booking.pickupLocation) ?? `Văn phòng GoReady${tour?.departure ? ` — ${tour.departure}` : ''}`;
  const diaDiem = new Map();
  const addDiaDiem = (d) => {
    diaDiem.set(d.maDiaDiem, d);
    return d.maDiaDiem;
  };

  // --- Lịch trình -------------------------------------------------------------------------------------------------
  const lichTrinh = [];
  const pushRow = (ngayThu, gio, tieuDe, moTa, maDiaDiem) =>
    lichTrinh.push({
      maLichTrinh: `${maChuyenDi}-lt${lichTrinh.length + 1}`,
      maChuyenDi,
      ngayThu,
      ngay: addDays(ngayKhoiHanh, ngayThu - 1),
      gio,
      tieuDe,
      moTa,
      maDiaDiem,
      thuTu: lichTrinh.length + 1,
    });

  pushRow(
    1,
    gioDon,
    'Xe & hướng dẫn viên đón khách',
    `${asText(booking.guideName) ? `HDV ${booking.guideName} ` : 'Hướng dẫn viên '}đón bạn tại điểm hẹn. Vui lòng có mặt trước giờ đón 15 phút, mang theo CMND/CCCD hoặc hộ chiếu.`,
    addDiaDiem(makeDiaDiem(diemDon, 'stop', null, null)),
  );

  const hasActivities = itinerary.some((d) => Array.isArray(d?.activities) && d.activities.length > 0);
  if (hasActivities) {
    itinerary.forEach((d, i) => {
      const ngayThu = Number(d?.day) || i + 1;
      for (const a of Array.isArray(d?.activities) ? d.activities : []) {
        const loc = a.location;
        const maDiaDiem = asText(loc?.name)
          ? addDiaDiem(makeDiaDiem(loc.name.trim(), asText(loc.type), Number(loc.lat), Number(loc.lng)))
          : null;
        pushRow(ngayThu, asText(a.time), asText(a.title) ?? `Ngày ${ngayThu}`, asText(a.description), maDiaDiem);
      }
    });
  } else {
    // The tour has no detailed schedule (e.g. removed, or imported without one): fall back to one line per day
    for (let ngayThu = 1; ngayThu <= soNgay; ngayThu++) {
      const day = itinerary[ngayThu - 1];
      const title = asText(day?.title);
      if (ngayThu === 1) pushRow(1, '10:00', title ?? `Khởi hành đến ${tour?.destination ?? 'điểm đến'}`, 'Nhận phòng và bắt đầu hành trình.', null);
      else if (ngayThu === soNgay) pushRow(ngayThu, '09:00', title ?? 'Trả phòng & kết thúc hành trình', 'Trả phòng, xe đưa đoàn về điểm hẹn ban đầu.', null);
      else pushRow(ngayThu, '08:00', title ?? `Ngày ${ngayThu}: Tham quan theo chương trình`, null, null);
    }
  }

  // --- Khách sạn --------------------------------------------------------------------------------------------------
  let khachSan = null;
  let ngayNhanPhong = null;
  let ngayTraPhong = null;
  if (soDem > 0) {
    const fromItinerary = itinerary.find((d) => asText(d?.accommodation))?.accommodation;
    const ten = asText(booking.hotelName) ?? asText(fromItinerary);
    if (ten) {
      const hotelLoc = itinerary
        .flatMap((d) => (Array.isArray(d?.activities) ? d.activities : []))
        .map((a) => a.location)
        .find((l) => l?.type === 'hotel' && asText(l?.name));
      const maDiaDiem = hotelLoc ? addDiaDiem(makeDiaDiem(hotelLoc.name.trim(), 'hotel', Number(hotelLoc.lat), Number(hotelLoc.lng))) : null;
      khachSan = {
        maKhachSan: `ks-${shortHash(`${ten}|${tour?.destination ?? ''}`)}`,
        tenKhachSan: ten,
        diaChi: [tour?.destination, tour?.country].filter(Boolean).join(', ') || null,
        hangSao: Number(tour?.hotelStars) || null,
        maDiaDiem,
      };
      ngayNhanPhong = ngayKhoiHanh;
      ngayTraPhong = addDays(ngayKhoiHanh, soDem);
    }
  }

  // --- Vé ---------------------------------------------------------------------------------------------------------
  const code = booking.bookingCode || booking.id;
  const adultPrice = tour ? Number(tour.discountPrice ?? tour.price) || null : null;
  const ve = [];
  const pushVe = (loaiVe, tenVe, prefix, n, giaVe) => {
    const maDatVe = `${code}-${prefix}${n}`;
    ve.push({
      maVe: `${maChuyenDi}-ve${ve.length + 1}`,
      maChuyenDi,
      loaiVe,
      tenVe,
      maDatVe,
      maQR: `GOREADY|${code}|${maDatVe}`,
      giaVe,
      thuTu: ve.length + 1,
    });
  };
  for (let i = 1; i <= (Number(booking.adults) || 0); i++) pushVe('Người lớn', `Vé tour — ${tenChuyenDi}`, 'A', i, adultPrice);
  for (let i = 1; i <= (Number(booking.children) || 0); i++) pushVe('Trẻ em', `Vé tour trẻ em — ${tenChuyenDi}`, 'C', i, adultPrice ? Math.round(adultPrice * 0.7) : null);
  for (let i = 1; i <= (Number(booking.infants) || 0); i++) pushVe('Em bé', `Vé tour em bé (miễn phí) — ${tenChuyenDi}`, 'I', i, 0);
  (Array.isArray(booking.addOns) ? booking.addOns : []).forEach((a, i) => pushVe('Dịch vụ thêm', asText(a?.label) ?? 'Dịch vụ thêm', 'S', i + 1, Number.isFinite(Number(a?.price)) ? Number(a.price) : null));

  return {
    chuyenDi: {
      maChuyenDi,
      maDon: booking.id,
      tenChuyenDi,
      diemDen: asText(tour?.destination),
      anhBia: asText(tour?.coverImage),
      ngayKhoiHanh,
      gioKhoiHanh: gioDon,
      ngayKetThuc,
      soNgay,
      soDem,
      phuongTien: asText(tour?.transport),
      diemDon,
      gioDon,
      tenHDV: asText(booking.guideName),
      sdtHDV: asText(booking.guidePhone),
      maKhachSan: khachSan?.maKhachSan ?? null,
      ngayNhanPhong,
      ngayTraPhong,
      ngayTao: new Date().toISOString(),
    },
    diaDiem: [...diaDiem.values()],
    khachSan,
    lichTrinh,
    ve,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------------------------------------------------

async function insertMany(client, table, cols, rows, onConflict = '') {
  if (rows.length === 0) return;
  const quoted = cols.map((c) => `"${c}"`).join(',');
  const values = [];
  const groups = rows.map((row, r) => {
    const ph = cols.map((c, i) => {
      values.push(row[c]);
      return `$${r * cols.length + i + 1}`;
    });
    return `(${ph.join(',')})`;
  });
  await client.query(`INSERT INTO ${table} (${quoted}) VALUES ${groups.join(',')} ${onConflict}`, values);
}

/** Creates the ChuyenDi (+ schedule, tickets, hotel) of one paid order. Safe to call twice: "maDon" is UNIQUE. */
export async function generateChuyenDi(pool, booking) {
  const { rows } = await pool.query(
    'SELECT id, name, destination, country, "coverImage", duration, nights, departure, transport, "hotelStars", price, "discountPrice", itinerary FROM tours WHERE id = $1',
    [booking.tourId],
  );
  const plan = buildChuyenDi(booking, rows[0]);
  if (!plan) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await insertMany(client, 'dia_diem', ['maDiaDiem', 'tenDiaDiem', 'loaiDiaDiem', 'diaChi', 'viDo', 'kinhDo'], plan.diaDiem, 'ON CONFLICT ("maDiaDiem") DO NOTHING');
    if (plan.khachSan) {
      await insertMany(client, 'khach_san', ['maKhachSan', 'tenKhachSan', 'diaChi', 'hangSao', 'maDiaDiem'], [plan.khachSan], 'ON CONFLICT ("maKhachSan") DO NOTHING');
    }
    const cdCols = Object.keys(plan.chuyenDi);
    const inserted = await client.query(
      `INSERT INTO chuyen_di (${cdCols.map((c) => `"${c}"`).join(',')}) VALUES (${cdCols.map((_, i) => `$${i + 1}`).join(',')})
       ON CONFLICT ("maDon") DO NOTHING RETURNING "maChuyenDi"`,
      cdCols.map((c) => plan.chuyenDi[c]),
    );
    // Someone else generated this trip a moment ago: keep theirs, add nothing
    if (inserted.rowCount > 0) {
      await insertMany(client, 'lich_trinh_chuyen_di', ['maLichTrinh', 'maChuyenDi', 'ngayThu', 'ngay', 'gio', 'tieuDe', 'moTa', 'maDiaDiem', 'thuTu'], plan.lichTrinh);
      await insertMany(client, 've', ['maVe', 'maChuyenDi', 'loaiVe', 'tenVe', 'maDatVe', 'maQR', 'giaVe', 'thuTu'], plan.ve);
    }
    await client.query('COMMIT');
    return inserted.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Every trip of the account with this contact e-mail, each with its order summary, hotel, schedule and tickets.
 * Orders that have no trip yet are turned into one first (paid orders only).
 */
export async function listChuyenDi(pool, email) {
  const owner = typeof email === 'string' ? email.trim() : '';
  if (!owner) return [];
  await ensureChuyenDiSchema(pool);

  const { rows: missing } = await pool.query(
    `SELECT b.* FROM bookings b LEFT JOIN chuyen_di c ON c."maDon" = b.id
     WHERE lower(b."contactEmail") = lower($1) AND b.status = ANY($2) AND c."maChuyenDi" IS NULL`,
    [owner, PAID_STATUSES],
  );
  for (const booking of missing) {
    try {
      await generateChuyenDi(pool, booking);
    } catch (err) {
      console.error(`[chuyen-di] could not create the trip of order ${booking.id}:`, err);
    }
  }

  const { rows: trips } = await pool.query(
    `SELECT c.*, b."bookingCode", b."tourId", b."totalPrice", b."paymentMethod", b.status AS "trangThaiDon",
            b.adults, b.children, b.infants, b."addOns", b."createdAt" AS "ngayDat", b."contactName", b."contactPhone", b.note
     FROM chuyen_di c JOIN bookings b ON b.id = c."maDon"
     WHERE lower(b."contactEmail") = lower($1) AND b.status = ANY($2)
     ORDER BY c."ngayKhoiHanh", c."maChuyenDi"`,
    [owner, PAID_STATUSES],
  );
  if (trips.length === 0) return [];

  const ids = trips.map((t) => t.maChuyenDi);
  const [schedule, tickets, hotels] = await Promise.all([
    pool.query(
      `SELECT l.*, d."tenDiaDiem", d."loaiDiaDiem", d."diaChi" AS "diaChiDiaDiem", d."viDo", d."kinhDo"
       FROM lich_trinh_chuyen_di l LEFT JOIN dia_diem d ON d."maDiaDiem" = l."maDiaDiem"
       WHERE l."maChuyenDi" = ANY($1) ORDER BY l."ngayThu", l."thuTu"`,
      [ids],
    ),
    pool.query('SELECT * FROM ve WHERE "maChuyenDi" = ANY($1) ORDER BY "thuTu"', [ids]),
    pool.query(
      `SELECT k.*, d."viDo", d."kinhDo" FROM khach_san k LEFT JOIN dia_diem d ON d."maDiaDiem" = k."maDiaDiem"
       WHERE k."maKhachSan" = ANY($1)`,
      [trips.map((t) => t.maKhachSan).filter(Boolean)],
    ),
  ]);

  const hotelById = new Map(hotels.rows.map((h) => [h.maKhachSan, h]));
  return trips.map((t) => {
    const daHuy = t.trangThaiDon === 'cancelled';
    return {
      maChuyenDi: t.maChuyenDi,
      maDon: t.maDon,
      tenChuyenDi: t.tenChuyenDi,
      diemDen: t.diemDen,
      anhBia: t.anhBia,
      ngayKhoiHanh: t.ngayKhoiHanh,
      gioKhoiHanh: t.gioKhoiHanh,
      ngayKetThuc: t.ngayKetThuc,
      soNgay: t.soNgay,
      soDem: t.soDem,
      phuongTien: t.phuongTien,
      diemDon: t.diemDon,
      gioDon: t.gioDon,
      tenHDV: t.tenHDV,
      sdtHDV: t.sdtHDV,
      ngayNhanPhong: t.ngayNhanPhong,
      ngayTraPhong: t.ngayTraPhong,
      ngayTao: t.ngayTao,
      don: {
        maDon: t.maDon,
        bookingCode: t.bookingCode,
        tourId: t.tourId,
        trangThai: t.trangThaiDon,
        tongTien: t.totalPrice,
        phuongThucThanhToan: t.paymentMethod,
        soNguoiLon: t.adults,
        soTreEm: t.children,
        soEmBe: t.infants,
        ngayDat: t.ngayDat,
        tenLienHe: t.contactName,
        sdtLienHe: t.contactPhone,
        ghiChu: t.note,
      },
      khachSan: t.maKhachSan && hotelById.has(t.maKhachSan) ? hotelById.get(t.maKhachSan) : null,
      lichTrinh: schedule.rows
        .filter((l) => l.maChuyenDi === t.maChuyenDi)
        .map((l) => ({
          maLichTrinh: l.maLichTrinh,
          ngayThu: l.ngayThu,
          ngay: l.ngay,
          gio: l.gio,
          tieuDe: l.tieuDe,
          moTa: l.moTa,
          diaDiem: l.maDiaDiem
            ? { maDiaDiem: l.maDiaDiem, tenDiaDiem: l.tenDiaDiem, loaiDiaDiem: l.loaiDiaDiem, diaChi: l.diaChiDiaDiem, viDo: l.viDo, kinhDo: l.kinhDo }
            : null,
        })),
      ve: tickets.rows
        .filter((v) => v.maChuyenDi === t.maChuyenDi)
        .map((v) => ({ maVe: v.maVe, loaiVe: v.loaiVe, tenVe: v.tenVe, maDatVe: v.maDatVe, maQR: v.maQR, giaVe: v.giaVe, trangThai: daHuy ? 'da_huy' : 'hop_le' })),
    };
  });
}
