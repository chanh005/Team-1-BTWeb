/**
 * Xây route sang trang Khám phá (/kham-pha), kèm query param `thanhpho` khi có.
 * Dùng chung cho mọi nơi cần điều hướng lọc theo thành phố (Banner, Điểm đến nổi
 * bật, ...) để hành vi luôn nhất quán — ví dụ khamPhaUrl('Da Nang') => '/kham-pha?thanhpho=Da+Nang'.
 */
export const khamPhaUrl = (thanhPho?: string): string => {
  const trimmed = thanhPho?.trim();
  if (!trimmed) return '/kham-pha';
  const params = new URLSearchParams();
  params.set('thanhpho', trimmed);
  return `/kham-pha?${params.toString()}`;
};
