/**
 * In-memory sliding-window Rate Limiter
 * Tự động dọn dẹp các bản ghi quá hạn để tiết kiệm bộ nhớ.
 */

class RateLimiter {
  constructor() {
    this.hits = new Map(); // key -> [timestamp, timestamp, ...]

    // Dọn dẹp định kỳ mỗi 5 phút
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits.entries()) {
        const filtered = timestamps.filter((t) => now - t < 15 * 60 * 1000);
        if (filtered.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, filtered);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  /**
   * Kiểm tra và ghi nhận lượt yêu cầu
   * @param {string} action - 'post' | 'comment' | 'reaction' | 'report'
   * @param {string} identifier - User ID hoặc IP
   * @param {number} maxRequests - Số lượt tối đa
   * @param {number} windowMs - Khung thời gian (ms)
   * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
   */
  check(action, identifier, maxRequests, windowMs) {
    const key = `${action}:${identifier}`;
    const now = Date.now();
    const timestamps = (this.hits.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true, remaining: maxRequests - timestamps.length, retryAfterSec: 0 };
  }
}

export const rateLimiter = new RateLimiter();

// Các cấu hình giới hạn mặc định
export const RATE_LIMITS = {
  CREATE_POST: { max: 5, windowMs: 10 * 60 * 1000, message: 'Bạn đăng bài quá nhanh, vui lòng thử lại sau.' },
  CREATE_COMMENT: { max: 15, windowMs: 60 * 1000, message: 'Bạn gửi bình luận quá nhanh, vui lòng chờ giây lát.' },
  REACTION: { max: 30, windowMs: 60 * 1000, message: 'Thao tác quá nhanh, vui lòng thử lại sau.' },
  REPORT: { max: 5, windowMs: 10 * 60 * 1000, message: 'Bạn đã gửi quá nhiều báo cáo, vui lòng thử lại sau.' },
};

export function checkRateLimit(identifier, type = 'reaction') {
  const config = type === 'post' ? RATE_LIMITS.CREATE_POST
    : type === 'comment' ? RATE_LIMITS.CREATE_COMMENT
    : type === 'report' ? RATE_LIMITS.REPORT
    : RATE_LIMITS.REACTION;
  return rateLimiter.check(type, identifier, config.max, config.windowMs);
}

export function resetRateLimits() {
  rateLimiter.hits.clear();
}

