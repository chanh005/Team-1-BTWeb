import { BADGE_RULES } from './config.js';

const METRIC_KEYS = { posts: 'postsCount', provinces: 'provincesCount', verifiedTrips: 'verifiedTripsCount' };

/**
 * Hàm thuần: tính huy hiệu từ số liệu đã đếm. Không đọc DB.
 * stats: { postsCount, provincesCount, verifiedTripsCount } (chỉ tính bài đã duyệt)
 * Trả về từng huy hiệu kèm `remaining` và `remainingLabel` ("Còn N bài").
 */
export function computeBadges(stats, rules = BADGE_RULES) {
  return rules.map((r) => {
    const current = Number(stats[METRIC_KEYS[r.metric]]) || 0;
    const remaining = Math.max(0, r.threshold - current);
    return {
      id: r.id,
      name: r.name,
      earned: remaining === 0,
      current,
      threshold: r.threshold,
      remaining,
      unit: r.unit,
      remainingLabel: remaining === 0 ? 'Đã đạt' : `Còn ${remaining} ${r.unit}`,
    };
  });
}

/** Dòng gợi ý dưới bản đồ: huy hiệu chưa đạt gần nhất. null nếu đã đạt hết. */
export function nextBadgeHint(badges) {
  const next = badges.filter((b) => !b.earned).sort((a, b) => a.remaining - b.remaining)[0];
  if (!next) return null;
  return `Còn ${next.remaining} ${next.unit} nữa để mở khóa huy hiệu "${next.name}".`;
}
