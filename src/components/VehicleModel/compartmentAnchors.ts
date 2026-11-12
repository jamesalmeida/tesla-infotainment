// Where the frunk and trunk are on screen, in viewport pixels, so the labels above the car can
// draw lines to them. The 3D view writes this each frame it draws; null means not on screen.
export interface ScreenPoint {
  x: number;
  y: number;
}

// The charge port also says which way is outward on screen, so its button sits beside the car
// rather than over it. Null while that side of the car faces away.
export interface PortPoint extends ScreenPoint {
  side: 1 | -1;
}

export interface CompartmentAnchors {
  frunk: ScreenPoint | null;
  trunk: ScreenPoint | null;
  chargePort: PortPoint | null;
  // The middle of the roof, where the lock's line ends.
  roof: ScreenPoint | null;
}

export const NO_ANCHORS: CompartmentAnchors = {
  frunk: null,
  trunk: null,
  chargePort: null,
  roof: null,
};

let current: CompartmentAnchors = NO_ANCHORS;
const listeners = new Set<() => void>();

const samePoint = (a: ScreenPoint | null, b: ScreenPoint | null) =>
  a === b || (a !== null && b !== null && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5);

export const setCompartmentAnchors = (next: CompartmentAnchors): void => {
  if (
    samePoint(current.frunk, next.frunk) &&
    samePoint(current.trunk, next.trunk) &&
    samePoint(current.chargePort, next.chargePort) &&
    samePoint(current.roof, next.roof) &&
    current.chargePort?.side === next.chargePort?.side
  ) {
    return;
  }
  current = next;
  listeners.forEach((listener) => listener());
};

export const getCompartmentAnchors = (): CompartmentAnchors => current;

export const subscribeCompartmentAnchors = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
