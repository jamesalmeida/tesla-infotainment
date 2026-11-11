type LatLng = google.maps.LatLngLiteral;

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export const normalizeHeading = (degrees: number) => ((degrees % 360) + 360) % 360;

export function distanceBetween(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** The compass direction from a to b, 0 being north. */
export function headingBetween(a: LatLng, b: LatLng): number {
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(latB);
  const x = Math.cos(latA) * Math.sin(latB) - Math.sin(latA) * Math.cos(latB) * Math.cos(dLng);
  return normalizeHeading(toDegrees(Math.atan2(y, x)));
}

/** Where `meters` of travel on `heading` ends up. */
export function moveFrom(start: LatLng, heading: number, meters: number): LatLng {
  const angle = meters / EARTH_RADIUS_METERS;
  const bearing = toRadians(heading);
  const lat = toRadians(start.lat);
  const endLat = Math.asin(
    Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing),
  );
  const dLng = Math.atan2(
    Math.sin(bearing) * Math.sin(angle) * Math.cos(lat),
    Math.cos(angle) - Math.sin(lat) * Math.sin(endLat),
  );
  return { lat: toDegrees(endLat), lng: start.lng + toDegrees(dLng) };
}

/** A path with the distance to each of its points worked out once, for quick lookups. */
export interface MeasuredPath {
  points: LatLng[];
  /** Metres from the start to each point. */
  distances: number[];
  length: number;
}

export function measurePath(points: LatLng[]): MeasuredPath {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + distanceBetween(points[i - 1], points[i]));
  }
  return { points, distances, length: distances.at(-1) ?? 0 };
}

// The last index whose distance isn't past `along`, by bisection: long routes have
// thousands of points and this runs on every simulator tick.
function segmentAt({ distances }: MeasuredPath, along: number): number {
  let low = 0;
  let high = distances.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (distances[middle] <= along) low = middle;
    else high = middle;
  }
  return low;
}

export interface PathPoint {
  position: LatLng;
  heading: number;
}

/** The point `along` metres down the path, and which way the road runs there. */
export function pointAlong(path: MeasuredPath, along: number): PathPoint | null {
  const { points, distances } = path;
  if (points.length === 0) return null;
  if (points.length === 1) return { position: points[0], heading: 0 };

  const index = segmentAt(path, along);
  const start = points[index];
  const end = points[index + 1];
  const span = distances[index + 1] - distances[index];
  const t = span > 0 ? Math.min(1, Math.max(0, (along - distances[index]) / span)) : 0;
  return {
    position: {
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    },
    heading: headingBetween(start, end),
  };
}

// Only looks a little behind the car and on ahead, so a road that doubles back on itself
// can't teleport the car to the wrong carriageway.
const PROJECTION_LOOK_BEHIND_METERS = 100;

/** The nearest point on the path to `position`, as a distance along it. */
export function projectOntoPath(
  path: MeasuredPath,
  position: LatLng,
  fromAlong: number,
): { along: number; offRoute: number } {
  const { points, distances } = path;
  if (points.length < 2) return { along: 0, offRoute: Infinity };

  const first = segmentAt(path, Math.max(0, fromAlong - PROJECTION_LOOK_BEHIND_METERS));
  // Flat maths is plenty at the scale of one road segment.
  const scale = Math.cos(toRadians(position.lat));
  let best = { along: fromAlong, offRoute: Infinity };

  for (let i = first; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = (b.lng - a.lng) * scale;
    const dy = b.lat - a.lat;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared > 0
        ? Math.min(
            1,
            Math.max(
              0,
              ((position.lng - a.lng) * scale * dx + (position.lat - a.lat) * dy) / lengthSquared,
            ),
          )
        : 0;
    const nearest = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    const offRoute = distanceBetween(position, nearest);
    if (offRoute < best.offRoute) {
      best = { along: distances[i] + (distances[i + 1] - distances[i]) * t, offRoute };
    }
  }
  return best;
}
