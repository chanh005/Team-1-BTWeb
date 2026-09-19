import React from 'react';

/**
 * Site routes (hash-based, no server config needed):
 *
 *   #/            Trang chủ — Khám phá Tour (Hero, "Gợi ý chuyến đi", bộ lọc, danh sách tour)
 *   #/tour/:id    Trang chi tiết Tour, mở chồng lên Trang chủ (id = mã tour, vd. SP01, hoặc id tour nội bộ)
 *
 * "Chuyến đi của tôi" vẫn chuyển bằng state của Navbar. Mọi thẻ tour (Gợi ý chuyến đi,
 * danh sách, đã lưu/so sánh) đều mở chi tiết qua cùng một route nên link chia sẻ và nút Back đều hoạt động.
 */
const TOUR_HASH = /^#\/tour\/([^/?#]+)/;

const readTourId = (): string | null => {
  const match = window.location.hash.match(TOUR_HASH);
  return match ? decodeURIComponent(match[1]) : null;
};

export const tourHref = (id: string) => `#/tour/${encodeURIComponent(id)}`;

export function useTourRoute() {
  const [tourId, setTourId] = React.useState<string | null>(readTourId);
  // True when the current tour route was pushed by the app, so closing can pop it with history.back()
  const pushedByApp = React.useRef(false);

  React.useEffect(() => {
    const sync = () => {
      const id = readTourId();
      if (!id) pushedByApp.current = false;
      setTourId(id);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const openTour = React.useCallback((id: string) => {
    pushedByApp.current = true;
    window.location.hash = tourHref(id);
  }, []);

  const closeTour = React.useCallback(() => {
    if (pushedByApp.current) {
      pushedByApp.current = false;
      window.history.back();
      return;
    }
    // Opened via deep link / pasted URL: there is no in-app entry to go back to, so just drop the hash
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setTourId(null);
  }, []);

  return { tourId, openTour, closeTour };
}
