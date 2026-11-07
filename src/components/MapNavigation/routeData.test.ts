import {
  currentStepIndex,
  formatDistance,
  formatDuration,
  maneuverAngle,
  readRoute,
  remainingMeters,
  remainingMs,
  type Route,
} from './routeData';

const raw = (route: object) => route as google.maps.routes.Route;
const path = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.1 },
];

describe('readRoute', () => {
  test('needs a path, and nothing else', () => {
    expect(readRoute(raw({}))).toBeNull();
    expect(readRoute(raw({ path: [] }))).toBeNull();

    const route = readRoute(raw({ path }));
    expect(route).toMatchObject({
      path,
      viewport: null,
      durationMs: null,
      legs: [],
      steps: [],
      tolls: null,
      description: null,
    });
    expect(route?.distanceMeters).toBe(route?.pathMeters);
  });

  test('takes the plain numbers out of LatLngAltitude-style points', () => {
    const point = { lat: 1, lng: 2, altitude: 3, toJSON: () => null };
    expect(readRoute(raw({ path: [point] }))?.path).toEqual([{ lat: 1, lng: 2 }]);
  });

  test('uses what Google reports over what it measures', () => {
    const route = readRoute(raw({ path, distanceMeters: 500, durationMillis: 60_000 }));
    expect(route?.distanceMeters).toBe(500);
    expect(route?.durationMs).toBe(60_000);
  });

  test.each([[NaN], [-1], [Infinity], ['12'], [null]])(
    'a duration of %s is treated as unknown',
    (durationMillis) => {
      expect(readRoute(raw({ path, durationMillis }))?.durationMs).toBeNull();
    },
  );

  test('lays steps along the drawn path, whatever Google says they add up to', () => {
    const route = readRoute(
      raw({
        path,
        legs: [
          {
            steps: [
              { distanceMeters: 100, instructions: 'Head east', maneuver: 'DEPART' },
              { distanceMeters: 300, instructions: 'Turn left', maneuver: 'TURN_LEFT' },
            ],
          },
        ],
      }),
    ) as Route;

    expect(route.steps.map((step) => step.instruction)).toEqual(['Head east', 'Turn left']);
    expect(route.steps[0].distanceMeters).toBe(100);
    expect(route.steps[0].endAlong).toBeCloseTo(route.pathMeters / 4, 3);
    expect(route.steps[1].endAlong).toBeCloseTo(route.pathMeters, 3);
  });

  test('marks where each leg ends', () => {
    const route = readRoute(
      raw({
        path,
        legs: [{ steps: [{ distanceMeters: 100 }] }, { steps: [{ distanceMeters: 100 }] }],
      }),
    ) as Route;

    expect(route.legs[0].endAlong).toBeCloseTo(route.pathMeters / 2, 3);
    expect(route.legs[1].endAlong).toBeCloseTo(route.pathMeters, 3);
  });

  test.each([
    [
      'a missing instruction falls back to the maneuver',
      { maneuver: 'TURN_SLIGHT_LEFT' },
      'Turn slight left',
    ],
    ['with neither it still says something', {}, 'Continue'],
    ['line breaks are flattened', { instructions: 'Turn left\nToll road' }, 'Turn left Toll road'],
  ])('%s', (_name, step, instruction) => {
    const route = readRoute(raw({ path, legs: [{ steps: [step] }] }));
    expect(route?.steps[0].instruction).toBe(instruction);
  });

  test.each([
    ['legs that are not a list', { legs: 'nope' }],
    ['a leg with no steps', { legs: [{}] }],
    ['steps with no distance', { legs: [{ steps: [{ instructions: 'Go' }] }] }],
  ])('survives %s', (_name, extra) => {
    expect(() => readRoute(raw({ path, ...extra }))).not.toThrow();
  });
});

describe('progress', () => {
  const route = {
    distanceMeters: 2000,
    pathMeters: 1000,
    durationMs: 600_000,
    steps: [
      { instruction: 'a', maneuver: null, distanceMeters: 1, endAlong: 400 },
      { instruction: 'b', maneuver: null, distanceMeters: 1, endAlong: 1000 },
    ],
  } as Route;

  test('what is left shrinks with the share of the path driven', () => {
    expect(remainingMeters(route, 250)).toBe(1500);
    expect(remainingMs(route, 500)).toBe(300_000);
    expect(remainingMeters(route, 5000)).toBe(0);
  });

  test('an unknown duration stays unknown', () => {
    expect(remainingMs({ ...route, durationMs: null }, 0)).toBeNull();
  });

  test('a zero-length path keeps everything left', () => {
    expect(remainingMeters({ ...route, pathMeters: 0 }, 0)).toBe(2000);
  });

  test.each([
    [0, 0],
    [399, 0],
    [400, 1],
    [999, 1],
    [1000, 1],
  ])('at %d m the current step is %d', (along, index) => {
    expect(currentStepIndex(route.steps, along)).toBe(index);
  });
});

test.each([
  [0, '0 ft'],
  [50, '150 ft'],
  [160, '500 ft'],
  [161, '0.1 mi'],
  [8047, '5.0 mi'],
  [32187, '20 mi'],
])('%d m reads %s', (meters, text) => {
  expect(formatDistance(meters)).toBe(text);
});

test.each([
  [10_000, 'Under 1 min'],
  [60_000, '1 min'],
  [59 * 60_000, '59 min'],
  [60 * 60_000, '1 hr'],
  [95 * 60_000, '1 hr 35 min'],
])('%d ms reads %s', (ms, text) => {
  expect(formatDuration(ms)).toBe(text);
});

test.each([
  ['TURN_LEFT', -90],
  ['TURN_RIGHT', 90],
  ['TURN_SLIGHT_LEFT', -45],
  ['TURN_SHARP_RIGHT', 135],
  ['UTURN_LEFT', -180],
  ['RAMP_RIGHT', 90],
  ['ROUNDABOUT_LEFT', -90],
  ['STRAIGHT', 0],
  ['SOMETHING_NEW', 0],
  [null, 0],
])('%s points %d degrees', (maneuver, angle) => {
  expect(maneuverAngle(maneuver)).toBe(angle);
});
