import {
  distanceBetween,
  headingBetween,
  measurePath,
  moveFrom,
  normalizeHeading,
  pointAlong,
  projectOntoPath,
} from './routeGeometry';

const ORIGIN = { lat: 0, lng: 0 };
const EAST = { lat: 0, lng: 1 };
const NORTH_EAST = { lat: 1, lng: 1 };
const DEGREE_METERS = 111_195;

test('distance matches a degree of the equator', () => {
  expect(distanceBetween(ORIGIN, EAST)).toBeCloseTo(DEGREE_METERS, -1);
  expect(distanceBetween(EAST, EAST)).toBe(0);
});

test.each([
  ['north', { lat: 1, lng: 0 }, 0],
  ['east', EAST, 90],
  ['south', { lat: -1, lng: 0 }, 180],
  ['west', { lat: 0, lng: -1 }, 270],
])('heading %s', (_name, to, heading) => {
  expect(headingBetween(ORIGIN, to)).toBeCloseTo(heading, 6);
});

test.each([
  [370, 10],
  [-10, 350],
  [720, 0],
])('normalizes %d to %d', (degrees, expected) => {
  expect(normalizeHeading(degrees)).toBe(expected);
});

test('moving on a heading undoes the distance and heading between two points', () => {
  const end = moveFrom(ORIGIN, 90, DEGREE_METERS);
  expect(end.lat).toBeCloseTo(0, 6);
  expect(end.lng).toBeCloseTo(1, 3);
});

describe('a measured path', () => {
  const path = measurePath([ORIGIN, EAST, NORTH_EAST]);

  test('adds up its segments', () => {
    expect(path.length).toBeCloseTo(DEGREE_METERS * 2, -2);
    expect(path.distances).toHaveLength(3);
  });

  test('finds a point partway down a segment, with its direction', () => {
    const point = pointAlong(path, path.distances[1] / 2);
    expect(point?.position.lng).toBeCloseTo(0.5, 6);
    expect(point?.heading).toBeCloseTo(90, 6);
  });

  test('turns the corner', () => {
    const point = pointAlong(path, path.distances[1] + 1000);
    expect(point?.position.lng).toBeCloseTo(1, 6);
    expect(point?.heading).toBeCloseTo(0, 6);
  });

  test('stays on the path at both ends', () => {
    expect(pointAlong(path, -5)?.position).toEqual(ORIGIN);
    expect(pointAlong(path, path.length + 5)?.position).toEqual(NORTH_EAST);
  });

  test('copes with too few points', () => {
    expect(pointAlong(measurePath([]), 0)).toBeNull();
    expect(pointAlong(measurePath([EAST]), 10)).toEqual({ position: EAST, heading: 0 });
    expect(measurePath([]).length).toBe(0);
  });

  test('duplicate points do not divide by zero', () => {
    const point = pointAlong(measurePath([ORIGIN, ORIGIN, EAST]), 0);
    expect(point?.position).toEqual(ORIGIN);
  });

  test('projects a nearby position onto the road', () => {
    const { along, offRoute } = projectOntoPath(path, { lat: 0.001, lng: 0.5 }, 0);
    expect(along).toBeCloseTo(path.distances[1] / 2, -2);
    expect(offRoute).toBeCloseTo(DEGREE_METERS / 1000, -1);
  });

  test('does not jump back to a part of the road well behind the car', () => {
    const uTurn = measurePath([ORIGIN, EAST, { lat: 0.00001, lng: 0 }]);
    const { along } = projectOntoPath(uTurn, { lat: 0, lng: 0.1 }, uTurn.distances[1] + 50_000);
    expect(along).toBeGreaterThan(uTurn.distances[1]);
  });

  test('a path too short to project reports the car as off it', () => {
    expect(projectOntoPath(measurePath([EAST]), ORIGIN, 0).offRoute).toBe(Infinity);
  });
});
