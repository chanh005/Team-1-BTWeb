export const formatVND = (amount: number): string =>
  amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

/**
 * Định dạng ThoiGian (số ngày tour) thành chuỗi "X ngày Y đêm".
 * Quy ước: tour X ngày có X-1 đêm (tối thiểu 0 đêm).
 */
export const formatThoiGian = (soNgay: number): string => `${soNgay} ngày ${Math.max(soNgay - 1, 0)} đêm`;

export const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateLong = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const discountPercent = (price: number, discountPrice?: number): number => {
  if (!discountPrice || discountPrice >= price) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
};

export const uid = (prefix = 'id'): string => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const generateBookingCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GR';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
