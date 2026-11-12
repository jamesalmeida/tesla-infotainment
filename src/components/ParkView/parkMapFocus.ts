import { useSyncExternalStore } from 'react';

// Where on screen the map should put the car while Park View leaves only a corner of it
// showing, in viewport pixels. Null when the whole map is in view.
export interface MapFocus {
  x: number;
  y: number;
}

let current: MapFocus | null = null;
const listeners = new Set<() => void>();

export const setParkMapFocus = (next: MapFocus | null): void => {
  if (next === current || (next && current && next.x === current.x && next.y === current.y)) {
    return;
  }
  current = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useParkMapFocus = (): MapFocus | null =>
  useSyncExternalStore(subscribe, () => current);
