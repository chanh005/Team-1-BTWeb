import { PROVINCES, PROVINCE_KEYWORDS } from './config.js';

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const MATCHERS = PROVINCES.map((name) => ({
  name,
  re: new RegExp(`(^|[^a-z])(${(PROVINCE_KEYWORDS[name] || []).join('|')})($|[^a-z])`),
}));

/** Đưa tên điểm đến tự do ("Đà Nẵng - Hội An", "Hà Giang Loop") về 1 trong 34 tỉnh; không khớp => null. */
export function normalizeProvince(text) {
  const t = fold(text);
  if (!t) return null;
  const direct = PROVINCES.find((p) => fold(p) === t);
  if (direct) return direct;
  const hit = MATCHERS.find((m) => m.re.test(t));
  return hit ? hit.name : null;
}
