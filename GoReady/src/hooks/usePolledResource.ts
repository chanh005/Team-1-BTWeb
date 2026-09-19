import React from 'react';

// Polls a backend fetcher on an interval so data added/changed from the other
// app (User site <-> Admin console) shows up here without a manual refresh.
export function usePolledResource<T>(fetcher: () => Promise<T>, intervalMs = 4000) {
  const [data, setData] = React.useState<T | null>(null);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = React.useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      console.error('usePolledResource fetch failed:', e);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, setData, refresh };
}
