import type { LiveDeparture } from '../types';

/** Từ số chỗ này trở xuống thì hiện "Chỉ còn N chỗ" để khách biết sắp hết. */
export const LOW_SEATS = 4;

/** Nhãn ngắn của một ngày khởi hành: "Còn 5 chỗ", "Chỉ còn 2 chỗ", "Hết chỗ" (đang có người giữ) hoặc "Đã hết vé". */
export const seatLabel = (d: LiveDeparture): string =>
  d.status === 'sold-out' ? 'Đã hết vé' : d.status === 'holding' ? 'Hết chỗ' : `${d.availableSeats <= LOW_SEATS ? 'Chỉ còn' : 'Còn'} ${d.availableSeats} chỗ`;
