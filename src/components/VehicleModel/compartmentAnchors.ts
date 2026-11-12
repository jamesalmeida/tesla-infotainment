// Where the frunk and trunk are on screen, in viewport pixels, so the labels above the car can
// draw lines to them. The 3D view writes this each frame it draws; null means not on screen.
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface CompartmentAnchors {
  frunk: ScreenPoint | null;
  trunk: ScreenPoint | null;
}

let current: CompartmentAnchors = { frunk: null, trunk: null };
const listeners = new Set<() => void>();

const samePoint = (a: ScreenPoint | null, b: ScreenPoint | null) =>
  a === b || (a !== null && b !== null && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5);

export const setCompartmentAnchors = (next: CompartmentAnchors): void => {
  if (samePoint(current.frunk, next.frunk) && samePoint(current.trunk, next.trunk)) return;
  current = next;
  listeners.forEach((listener) => listener());
};

export const getCompartmentAnchors = (): CompartmentAnchors => current;

export const subscribeCompartmentAnchors = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
