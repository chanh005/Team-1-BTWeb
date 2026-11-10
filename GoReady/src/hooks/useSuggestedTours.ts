import React from 'react';
import type { Tour } from '../types';
import { fetchSuggestedTours } from '../services/suggestedTours';

export type SuggestedToursStatus = 'loading' | 'ready' | 'error';

export function useSuggestedTours() {
  const [tours, setTours] = React.useState<Tour[]>([]);
  const [status, setStatus] = React.useState<SuggestedToursStatus>('loading');
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetchSuggestedTours(controller.signal)
      .then((data) => {
        setTours(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => setAttempt((n) => n + 1), []);

  return { tours, status, reload };
}
