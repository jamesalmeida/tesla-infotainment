import { STEP_SECONDS, type GameButton, type GameInput } from '../runtime';
import { LEVELS, type Box } from './levels';
import {
  CAR_LENGTH,
  CAR_WIDTH,
  MAX_SCUFFS,
  WORLD_WIDTH,
  boxContains,
  boxesOverlap,
  createState,
  drive,
  hitsSomething,
  isInBay,
  isOver,
  levelScore,
  step,
  type CurbState,
} from './rules';
import { SOLUTIONS } from './solutions.fixture';

const input = (...held: GameButton[]): GameInput => ({
  held: new Set(held),
  pressed: new Set(held),
});

const hold = (state: CurbState, seconds: number, ...held: GameButton[]) => {
  let next = state;
  for (let frame = 0; frame < Math.round(seconds / STEP_SECONDS); frame += 1) {
    next = step(next, input(...held), STEP_SECONDS);
  }
  return next;
};

const box = (overrides: Partial<Box>): Box => ({
  x: 0,
  y: 0,
  heading: 0,
  length: 2,
  width: 1,
  ...overrides,
});

test('rotated boxes only overlap when they really touch', () => {
  expect(boxesOverlap(box({}), box({ x: 1.5 }))).toBe(true);
  expect(boxesOverlap(box({}), box({ x: 2.5 }))).toBe(false);
  // Corner to corner: their bounding boxes overlap, they don't.
  expect(boxesOverlap(box({}), box({ x: 1.9, y: 1.1, heading: Math.PI / 4 }))).toBe(false);
});

test('boxContains respects rotation', () => {
  const upright = box({ heading: Math.PI / 2 });
  expect(boxContains(upright, { x: 0, y: 0.9 })).toBe(true);
  expect(boxContains(upright, { x: 0.9, y: 0 })).toBe(false);
});

test('the car goes straight with the wheels straight and turns with them turned', () => {
  const start = { x: 5, y: 4, heading: 0 };
  expect(drive(start, 2, 0, 1)).toEqual({ x: 7, y: 4, heading: 0 });
  expect(drive(start, 2, 1, 0.1).heading).toBeGreaterThan(0);
  expect(drive(start, -2, 1, 0.1).heading).toBeLessThan(0);
});

test('a parked car does not turn when the wheel does', () => {
  expect(drive({ x: 5, y: 4, heading: 1 }, 0, 1, 1).heading).toBe(1);
});

test('throttle moves the car and it coasts to a stop', () => {
  const moving = hold(createState(), 1, 'up');
  expect(moving.car.x).toBeGreaterThan(LEVELS[0].start.x);
  expect(hold(moving, 3).speed).toBe(0);
});

test('the bay only counts when the car is inside it facing the right way', () => {
  const { bay } = LEVELS[0];
  expect(isInBay({ x: bay.x, y: bay.y, heading: bay.heading }, bay)).toBe(true);
  expect(isInBay({ x: bay.x, y: bay.y, heading: bay.heading + Math.PI }, bay)).toBe(false);
  expect(isInBay({ x: bay.x + 1, y: bay.y, heading: bay.heading }, bay)).toBe(false);
});

test('stopping in the bay scores and moves on to the next level', () => {
  const { bay } = LEVELS[0];
  const parked = { ...createState(), car: { x: bay.x, y: bay.y, heading: bay.heading } };
  const celebrating = hold(parked, 0.6);
  expect(celebrating.celebrating).toBeGreaterThan(0);
  expect(celebrating.score).toBeGreaterThan(0);

  const next = hold(celebrating, 1.3);
  expect(next.level).toBe(1);
  expect(next.car).toEqual(LEVELS[1].start);
});

test('rolling through the bay does not count', () => {
  const { bay } = LEVELS[0];
  const rolling = { ...createState(), car: { x: bay.x, y: bay.y, heading: bay.heading }, speed: 1 };
  expect(step(rolling, input('up'), STEP_SECONDS).settled).toBe(0);
});

test('a hit stops the car where it was, bounces it, and scuffs it once', () => {
  const obstacle = LEVELS[0].obstacles[0];
  const facing = {
    ...createState(),
    car: { x: obstacle.x, y: obstacle.y + 2.2, heading: -Math.PI / 2 },
    speed: 3,
  };
  const after = hold(facing, 0.5, 'up');
  expect(after.scuffs).toBe(1);
  expect(hitsSomething(after.car, LEVELS[0])).toBe(false);
});

test('the edge of the lot is solid', () => {
  const nearEdge = { x: WORLD_WIDTH - CAR_LENGTH / 2 + 0.1, y: 4, heading: 0 };
  expect(hitsSomething(nearEdge, LEVELS[0])).toBe(true);
});

test('too many scuffs ends the run', () => {
  expect(isOver({ ...createState(), scuffs: MAX_SCUFFS - 1 })).toBe(false);
  expect(isOver({ ...createState(), scuffs: MAX_SCUFFS })).toBe(true);
});

test('quicker parking scores more, with a floor', () => {
  expect(levelScore(5)).toBeGreaterThan(levelScore(20));
  expect(levelScore(1000)).toBe(50);
});

test('every level starts clear of obstacles with a bay the car fits', () => {
  for (const level of LEVELS) {
    expect(hitsSomething(level.start, level)).toBe(false);
    expect(level.bay.length).toBeGreaterThan(CAR_LENGTH);
    expect(level.bay.width).toBeGreaterThan(CAR_WIDTH);
    const parked = { x: level.bay.x, y: level.bay.y, heading: level.bay.heading };
    expect(hitsSomething(parked, level)).toBe(false);
  }
});

test.each(LEVELS.map((level, index) => [level.name, index] as const))(
  '%s can be finished with a recorded drive',
  (_name, index) => {
    let state: CurbState = { ...createState(), level: index, car: LEVELS[index].start };
    for (const [seconds, ...held] of SOLUTIONS[index]) {
      state = hold(state, seconds, ...held);
    }
    state = hold(state, 2.5); // Coast to a stop.
    expect(state.celebrating > 0 || state.level > index || state.won).toBe(true);
    expect(state.scuffs).toBe(0);
  },
);
