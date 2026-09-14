/**
 * Sinh URL ảnh placeholder ổn định (deterministic) theo seed — dùng cho các card/carousel
 * chưa có ảnh thật từ CSDL (bảng Tour/DiaDiem hiện chưa có field ảnh). Cùng seed luôn ra
 * cùng ảnh, tiện cho việc xem trước giao diện trước khi có API ảnh thật.
 */
export const placeholderImage = (seed: string, w = 600, h = 400): string =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
