import { useLayoutEffect, useSyncExternalStore } from 'react';

export type LayoutMode = 'stage' | 'compact' | 'stacked';

export interface Layout {
  mode: LayoutMode;
  // Stacked with room for the car and the map at once, like an iPad in portrait.
  isTall: boolean;
}

// Layout follows the space the window has, never the device. Screen sizes and user agents
// can't be trusted here: on iOS they don't follow the window, and iPads report as Macs.
const STACKED_QUERY = '(max-aspect-ratio: 23/20), (max-width: 599px)';
const COMPACT_QUERY = '(max-height: 499px)';
const TALL_QUERY = '(min-width: 600px) and (min-height: 800px)';

const QUERIES = [STACKED_QUERY, COMPACT_QUERY, TALL_QUERY];

const matches = (query: string) => window.matchMedia(query).matches;

const readSnapshot = (): string => {
  const mode: LayoutMode = matches(STACKED_QUERY)
    ? 'stacked'
    : matches(COMPACT_QUERY)
      ? 'compact'
      : 'stage';
  return `${mode}:${matches(TALL_QUERY) ? 'tall' : 'short'}`;
};

const subscribe = (onChange: () => void) => {
  const lists = QUERIES.map((query) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onChange));
};

export function useLayout(): Layout {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot);
  const [mode, height] = snapshot.split(':') as [LayoutMode, string];

  // CSS branches on this attribute, so it has to be set before the first paint.
  useLayoutEffect(() => {
    document.documentElement.dataset.layout = mode;
  }, [mode]);

  return { mode, isTall: mode === 'stacked' && height === 'tall' };
}
