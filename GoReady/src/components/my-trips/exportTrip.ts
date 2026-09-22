import { formatVND } from '../../utils/format';
import type { ChuyenDi } from './types';
import { durationLabel, fmtDate, fmtDateLong, groupByDay, paymentLabel } from './tripUtils';

export const SUPPORT_HOTLINE = '1900 1080';

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

function download(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** A plain-text itinerary the traveller can keep offline or forward. */
export function tripToText(trip: ChuyenDi): string {
  const L: string[] = [];
  const line = (s = '') => L.push(s);

  line(`HÀNH TRÌNH GOREADY — ${trip.tenChuyenDi}`);
  line('='.repeat(60));
  line(`Mã đơn: ${trip.don.bookingCode}`);
  line(`Thời gian: ${fmtDateLong(trip.ngayKhoiHanh)} → ${fmtDateLong(trip.ngayKetThuc)} (${durationLabel(trip)})`);
  line(`Số khách: ${trip.don.soNguoiLon} người lớn, ${trip.don.soTreEm} trẻ em, ${trip.don.soEmBe} em bé`);
  line(`Tổng chi phí: ${formatVND(trip.don.tongTien)} (${paymentLabel(trip.don.phuongThucThanhToan)})`);
  line(`Người đặt: ${trip.don.tenLienHe} — ${trip.don.sdtLienHe}`);
  line();

  line('ĐÓN KHÁCH & DI CHUYỂN');
  line('-'.repeat(60));
  if (trip.phuongTien) line(`Phương tiện: ${trip.phuongTien}`);
  line(`Điểm đón: ${trip.diemDon ?? '—'} lúc ${trip.gioDon ?? '—'}`);
  if (trip.tenHDV) line(`Hướng dẫn viên: ${trip.tenHDV}${trip.sdtHDV ? ` — ${trip.sdtHDV}` : ''}`);
  line();

  line('LƯU TRÚ');
  line('-'.repeat(60));
  if (trip.khachSan) {
    line(`${trip.khachSan.tenKhachSan}${trip.khachSan.hangSao ? ` (${trip.khachSan.hangSao}★)` : ''}`);
    if (trip.khachSan.diaChi) line(`Địa chỉ: ${trip.khachSan.diaChi}`);
    if (trip.ngayNhanPhong) line(`Nhận phòng: ${fmtDate(trip.ngayNhanPhong)} (từ 14:00)`);
    if (trip.ngayTraPhong) line(`Trả phòng: ${fmtDate(trip.ngayTraPhong)} (trước 12:00)`);
  } else {
    line('Tour trong ngày, không có lưu trú.');
  }
  line();

  line('LỊCH TRÌNH');
  line('-'.repeat(60));
  for (const day of groupByDay(trip.lichTrinh)) {
    line(`Ngày ${day.ngayThu} — ${fmtDateLong(day.ngay)}`);
    for (const r of day.rows) {
      line(`  ${r.gio ?? '     '}  ${r.tieuDe}${r.diaDiem ? ` @ ${r.diaDiem.tenDiaDiem}` : ''}`);
      if (r.moTa) line(`         ${r.moTa}`);
    }
    line();
  }

  line('VÉ ĐIỆN TỬ');
  line('-'.repeat(60));
  for (const v of trip.ve) line(`  ${v.maDatVe}  ${v.loaiVe} — ${v.tenVe}`);
  line();
  line(`Hỗ trợ 24/7: ${SUPPORT_HOTLINE}. Vui lòng nêu mã đơn ${trip.don.bookingCode} khi liên hệ.`);
  return L.join('\r\n');
}

export const downloadTripText = (trip: ChuyenDi) => download(`hanh-trinh-${trip.don.bookingCode}-${slug(trip.tenChuyenDi)}.txt`, 'text/plain', tripToText(trip));

// --- iCalendar -----------------------------------------------------------------------------------------------------

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (isoDate: string) => isoDate.replace(/-/g, '');
const nextDay = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
// Content lines longer than 75 octets must be folded
const fold = (s: string) => s.replace(/(.{1,72})(?=.)/g, '$1\r\n ');

/** One all-day event spanning the trip, with a reminder the day before. Opens in Google/Apple/Outlook calendars. */
export function tripToIcs(trip: ChuyenDi): string {
  const description = [
    `Mã đơn: ${trip.don.bookingCode}`,
    `Đón khách: ${trip.diemDon ?? '—'} lúc ${trip.gioDon ?? '—'}`,
    trip.tenHDV ? `HDV: ${trip.tenHDV}${trip.sdtHDV ? ` — ${trip.sdtHDV}` : ''}` : '',
    trip.khachSan ? `Khách sạn: ${trip.khachSan.tenKhachSan}` : '',
    `Hỗ trợ 24/7: ${SUPPORT_HOTLINE}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GoReady//Chuyen di cua toi//VI',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${trip.maChuyenDi}@goready`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${compact(trip.ngayKhoiHanh)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(trip.ngayKetThuc))}`,
    fold(`SUMMARY:${icsEscape(`${trip.tenChuyenDi} (GoReady)`)}`),
    fold(`DESCRIPTION:${icsEscape(description)}`),
    fold(`LOCATION:${icsEscape(trip.diemDon ?? trip.diemDen ?? '')}`),
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Ngày mai bạn khởi hành cùng GoReady!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export const downloadTripIcs = (trip: ChuyenDi) => download(`chuyen-di-${trip.don.bookingCode}.ics`, 'text/calendar', tripToIcs(trip));
