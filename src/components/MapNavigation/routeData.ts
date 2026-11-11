import { measurePath } from './routeGeometry';

type LatLng = google.maps.LatLngLiteral;

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;
const FEET_LIMIT_METERS = 0.1 * METERS_PER_MILE;

export interface RouteStep {
  instruction: string;
  maneuver: string | null;
  distanceMeters: number;
  /** Where the step ends, in metres along the route's own path. */
  endAlong: number;
}

export interface RouteLeg {
  /** Where the leg ends, in metres along the route's own path. */
  endAlong: number;
}

/** `null` means Google said nothing about tolls either way. */
export type RouteTolls =
  { kind: 'none' } | { kind: 'unknownPrice' } | { kind: 'priced'; label: string } | null;

export interface Route {
  path: LatLng[];
  viewport: google.maps.LatLngBounds | null;
  /** The route's length as Google gives it, or as measured if it doesn't. */
  distanceMeters: number;
  /** The length of `path`, the scale that progress along the route is measured on. */
  pathMeters: number;
  /** Null if Google gives no duration. */
  durationMs: number | null;
  legs: RouteLeg[];
  steps: RouteStep[];
  tolls: RouteTolls;
  /** Google's own summary of the route, such as the road it mostly takes. */
  description: string | null;
}

/** What to ask for. Every field is billed, so nothing goes here that isn't shown. */
export const ROUTE_FIELDS = ['path', 'viewport', 'distanceMeters', 'durationMillis', 'legs'];

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function maneuverWords(maneuver: string | null) {
  if (!maneuver) return null;
  const words = maneuver.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function readSteps(
  legs: google.maps.routes.RouteLeg[],
  pathMeters: number,
): { steps: RouteStep[]; legs: RouteLeg[] } {
  const rawLegs = legs.map((leg) => (Array.isArray(leg.steps) ? leg.steps : []));
  const reportedMeters = (step: google.maps.routes.RouteLegStep) =>
    isPositive(step.distanceMeters) ? step.distanceMeters : 0;
  const total = rawLegs.flat().reduce((sum, step) => sum + reportedMeters(step), 0);
  // Google's distances and the drawn path never quite agree. Progress runs on the path.
  const scale = total > 0 && pathMeters > 0 ? pathMeters / total : 1;

  const steps: RouteStep[] = [];
  const legEnds: RouteLeg[] = [];
  let along = 0;
  for (const legSteps of rawLegs) {
    for (const step of legSteps) {
      const distanceMeters = reportedMeters(step);
      along += distanceMeters * scale;
      const maneuver = step.maneuver ?? null;
      steps.push({
        instruction:
          step.instructions?.replaceAll('\n', ' ') || maneuverWords(maneuver) || 'Continue',
        maneuver,
        distanceMeters,
        endAlong: along,
      });
    }
    legEnds.push({ endAlong: along });
  }
  return { steps, legs: legEnds };
}

/**
 * Turns a Routes library result into plain data, or null if it has no path to drive. Only
 * the path is essential: Google's shapes can't be checked against the live API here, so
 * anything else that's missing just leaves that part of the display out.
 */
export function readRoute(raw: google.maps.routes.Route): Route | null {
  if (!raw.path?.length) return null;
  const path = raw.path.map(({ lat, lng }) => ({ lat, lng }));
  const pathMeters = measurePath(path).length;
  const { steps, legs } = readSteps(Array.isArray(raw.legs) ? raw.legs : [], pathMeters);

  return {
    path,
    viewport: raw.viewport ?? null,
    distanceMeters: isPositive(raw.distanceMeters) ? raw.distanceMeters : pathMeters,
    pathMeters,
    durationMs: isPositive(raw.durationMillis) ? raw.durationMillis : null,
    legs,
    steps,
    tolls: null,
    description: raw.description ?? null,
  };
}

const remainingShare = ({ pathMeters }: Route, along: number) =>
  pathMeters > 0 ? Math.max(0, 1 - along / pathMeters) : 1;

export const remainingMeters = (route: Route, along: number) =>
  route.distanceMeters * remainingShare(route, along);

export const remainingMs = (route: Route, along: number) =>
  route.durationMs === null ? null : route.durationMs * remainingShare(route, along);

/** The step being driven: the first that ends beyond the car. */
export function currentStepIndex(steps: RouteStep[], along: number): number {
  const index = steps.findIndex((step) => step.endAlong > along);
  return index === -1 ? steps.length - 1 : index;
}

export function formatDistance(meters: number): string {
  if (meters < FEET_LIMIT_METERS) {
    const feet = Math.round((meters * FEET_PER_METER) / 50) * 50;
    return `${feet} ft`;
  }
  const miles = meters / METERS_PER_MILE;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'Under 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export const formatClock = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const ARROW_ANGLES: [RegExp, number][] = [
  [/^UTURN_LEFT/, -180],
  [/^UTURN_RIGHT/, 180],
  [/SLIGHT_LEFT/, -45],
  [/SLIGHT_RIGHT/, 45],
  [/SHARP_LEFT/, -135],
  [/SHARP_RIGHT/, 135],
  [/LEFT/, -90],
  [/RIGHT/, 90],
];

/** How far to turn a straight-ahead arrow to show a maneuver. Unknown ones point ahead. */
export function maneuverAngle(maneuver: string | null): number {
  if (!maneuver) return 0;
  return ARROW_ANGLES.find(([pattern]) => pattern.test(maneuver))?.[1] ?? 0;
}
