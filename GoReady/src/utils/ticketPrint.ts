import type { Booking, PaymentMethod, Tour } from '../types';
import { formatVND } from './format';

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  vietqr: 'Chuyển khoản QR (VietQR)',
  card: 'Thẻ quốc tế Visa/Mastercard',
  momo: 'Ví MoMo',
  vnpay: 'Ví VNPay',
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const ticketHtml = (b: Booking, tour: Tour): string => {
  const e = escapeHtml;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(b.bookingCode)}`;
  const date = new Date(b.departureDate).toLocaleDateString('vi-VN');
  const guests = `${b.adults} người lớn, ${b.children} trẻ em, ${b.infants} em bé`;
  const rows: [string, string][] = [
    ['Hành trình', tour.name],
    ['Khởi hành', `${date}${b.departureCode ? ` · Mã đoàn ${b.departureCode}` : ''}`],
    ['Số khách', guests],
    ['Điểm đón', `${b.pickupLocation} — ${b.pickupTime}`],
    ['Khách sạn', b.hotelName],
    ['Hướng dẫn viên', `${b.guideName} — ${b.guidePhone}`],
    ...b.addOns.map((a): [string, string] => ['Dịch vụ đi kèm', `${a.label}${a.quantity && a.quantity > 1 ? ` × ${a.quantity}` : ''}`]),
    ['Người liên hệ', `${b.contactName} · ${b.contactPhone} · ${b.contactEmail}`],
    ['Thanh toán', `${PAYMENT_LABEL[b.paymentMethod]} — ${formatVND(b.totalPrice)}`],
  ];

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Vé điện tử ${e(b.bookingCode)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; }
  .ticket { max-width: 640px; margin: 0 auto; border: 2px dashed #94a3b8; border-radius: 16px; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
  .brand { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
  .code { font-size: 32px; font-weight: 800; letter-spacing: .06em; margin: 4px 0 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
  td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
  td:first-child { width: 150px; color: #64748b; }
  td:last-child { font-weight: 600; }
  .foot { margin-top: 16px; font-size: 12px; color: #64748b; text-align: center; }
  @media print { body { padding: 0; } }
</style></head>
<body><div class="ticket">
  <div class="head"><div><div class="brand">GoReady · Vé điện tử</div><p class="code">${e(b.bookingCode)}</p></div><img src="${qr}" width="110" height="110" alt="QR check-in"></div>
  <table>${rows.map(([k, v]) => `<tr><td>${e(k)}</td><td>${e(v)}</td></tr>`).join('')}</table>
  <p class="foot">Vui lòng xuất trình mã booking hoặc mã QR này khi làm thủ tục.</p>
</div></body></html>`;
};

/** Mở vé trong cửa sổ mới rồi gọi hộp thoại in (chọn "Lưu dạng PDF" để tải về). Nếu trình duyệt chặn cửa sổ, tải file HTML. */
export const printTicket = (booking: Booking, tour: Tour): void => {
  const html = ticketHtml(booking, tour);
  const win = window.open('', '_blank', 'width=820,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => win.print());
    return;
  }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `GoReady-ve-${booking.bookingCode}.html`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
