import {
  distanceBetween,
  headingBetween,
  measurePath,
  moveFrom,
  pointAlong,
  projectOntoPath,
  type MeasuredPath,
} from './routeGeometry';

type LatLng = google.maps.LatLngLiteral;

/** How often subscribers hear about movement. The simulator ticks faster than this. */
export const PUBLISH_INTERVAL_MS = 250;
// A fix this far from the route means the car has left it, so it's shown where it really is.
const OFF_ROUTE_METERS = 50;
// GPS jitter on a parked car shouldn't spin the marker.
const MIN_HEADING_MOVE_METERS = 3;

export interface CarPose {
  position: LatLng;
  /** Compass degrees, 0 being north. */
  heading: number;
  /** Metres driven along the route, or null with no route. */
  along: number | null;
}

/*
 * Where the car is right now, outside React. Movement arrives ten times a second, which
 * would re-render the whole map from state, so it lands here instead: `getLivePose` is
 * always current, and subscribers (the marker, the camera, the turn card) get a throttled
 * `getPose`.
 */
export function createCarTracker(start: LatLng) {
  let live: CarPose = { position: start, heading: 0, along: null };
  let published = live;
  let path: MeasuredPath | null = null;
  let lastPublish = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const publishNow = () => {
    clearTimeout(timer);
    timer = undefined;
    lastPublish = performance.now();
    published = live;
    listeners.forEach((listener) => listener());
  };

  const publishSoon = () => {
    if (timer !== undefined) return;
    const wait = lastPublish + PUBLISH_INTERVAL_MS - performance.now();
    if (wait <= 0) publishNow();
    else timer = setTimeout(publishNow, wait);
  };

  const moveToAlong = (along: number) => {
    if (!path) return;
    const clamped = Math.min(along, path.length);
    const point = pointAlong(path, clamped);
    if (point) live = { ...point, along: clamped };
  };

  return {
    getPose: () => published,
    getLivePose: () => live,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Puts the car somewhere outright, such as after a location fix. */
    jumpTo(position: LatLng) {
      if (position === live.position) return;
      live = { ...live, position };
      publishNow();
    },

    /** Starts a new route from its beginning, or goes back to free driving with null. */
    followRoute(points: LatLng[] | null) {
      path = points ? measurePath(points) : null;
      if (!path) {
        live = { ...live, along: null };
      } else if (path.length > 0) {
        // The route starts at the car, so only the road's direction is new.
        const start = pointAlong(path, 0);
        live = { ...live, along: 0, heading: start?.heading ?? live.heading };
      } else {
        live = { ...live, along: 0 };
      }
      publishNow();
    },

    /** Simulated movement: on along the route, or straight ahead with no route. */
    advance(meters: number) {
      if (path && path.length > 0) moveToAlong((live.along ?? 0) + meters);
      else live = { ...live, position: moveFrom(live.position, live.heading, meters) };
      publishSoon();
    },

    /** A real position from the device, snapped to the route when it's on it. */
    applyFix(position: LatLng, heading: number | null) {
      if (path && path.length > 0) {
        const { along, offRoute } = projectOntoPath(path, position, live.along ?? 0);
        if (offRoute <= OFF_ROUTE_METERS) {
          moveToAlong(along);
          publishSoon();
          return;
        }
      }
      const moved = distanceBetween(live.position, position);
      live = {
        ...live,
        position,
        heading:
          heading ??
          (moved >= MIN_HEADING_MOVE_METERS
            ? headingBetween(live.position, position)
            : live.heading),
      };
      publishSoon();
    },

    dispose() {
      clearTimeout(timer);
      timer = undefined;
      listeners.clear();
    },
  };
}

export type CarTracker = ReturnType<typeof createCarTracker>;
