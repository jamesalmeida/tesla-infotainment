import { useCallback, useEffect, useReducer, useRef } from 'react';

export type BootStatus = 'loading' | 'settling' | 'ready';
export type BootEvent = 'contentSettled' | 'settled' | 'timedOut';

// Long enough that the screen doesn't flash on a warm cache.
export const MIN_LOADING_MS = 800;
// Never hold the app back longer than this, whatever happens to the 3D model.
export const FALLBACK_MS = 10000;

export function bootReducer(status: BootStatus, event: BootEvent): BootStatus {
  if (event === 'timedOut') return 'ready';
  if (status === 'loading' && event === 'contentSettled') return 'settling';
  if (status === 'settling' && event === 'settled') return 'ready';
  return status;
}

// The loading screen waits for the 3D car, which either loaded or failed. Third-party
// images don't count: a slow album art host must not delay the display.
export function useBoot() {
  const [status, dispatch] = useReducer(bootReducer, 'loading');
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
    const fallback = setTimeout(() => dispatch('timedOut'), FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (status !== 'settling') return;
    const elapsed = performance.now() - startedAt.current;
    const timer = setTimeout(() => dispatch('settled'), Math.max(0, MIN_LOADING_MS - elapsed));
    return () => clearTimeout(timer);
  }, [status]);

  const onContentSettled = useCallback(() => dispatch('contentSettled'), []);

  return { isLoading: status !== 'ready', onContentSettled };
}
