import { useCallback, useSyncExternalStore } from 'react';

/** The way the map is turned right now, 0 being north up. */
export function useMapHeading(map: google.maps.Map | null): number {
  const subscribe = useCallback(
    (listener: () => void) => {
      const subscription = map?.addListener('heading_changed', listener);
      return () => subscription?.remove();
    },
    [map],
  );
  return useSyncExternalStore(subscribe, () => map?.getHeading() ?? 0);
}
