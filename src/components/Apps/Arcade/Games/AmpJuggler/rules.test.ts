import { createRandom, STEP_SECONDS, type GameButton, type GameInput } from '../runtime';
import {
  MAX_LEVEL,
  MAX_STRIKES,
  SITE_CAPACITY,
  STALLS,
  TRIP_SECONDS,
  arrivalGap,
  createState,
  isOver,
  setLevel,
  siteLoad,
  stallBounds,
  step,
  tapWorld,
  type AmpState,
  type Car,
} from './rules';

const input = (pressed: GameButton[] = []): GameInput => ({
  held: new Set(pressed),
  pressed: new Set(pressed),
});
const random = createRandom(3);

const car = (overrides: Partial<Car> = {}): Car => ({
  id: 1,
  need: 50,
  charged: 0,
  patience: 20,
  fullPatience: 20,
  ...overrides,
});
const quietState = (overrides: Partial<AmpState> = {}): AmpState => ({
  ...createState(),
  nextArrival: 1000,
  ...overrides,
});
const withCars = (levels: number[], overrides: Partial<AmpState> = {}): AmpState =>
  quietState({
    stalls: levels.map((level, index) => ({ car: car({ id: index + 1 }), level })),
    ...overrides,
  });

test('more power charges a car faster', () => {
  const after = step(withCars([1, 3, 0, 0]), input(), 1, random);
  const [slow, fast, off] = after.stalls.map((stall) => stall.car?.charged ?? 0);
  expect(off).toBe(0);
  expect(fast).toBeCloseTo(slow * 3);
});

test('a full car leaves, scores, and frees the stall with its power off', () => {
  const state = quietState({
    stalls: [
      { car: car({ need: 1, charged: 0.99, patience: 8 }), level: 3 },
      ...withCars([0, 0, 0]).stalls,
    ],
  });
  const after = step(state, input(), 0.1, random);
  expect(after.stalls[0]).toEqual({ car: null, level: 0 });
  expect(after.served).toBe(1);
  expect(after.score).toBeGreaterThan(10);
});

test('a car that runs out of patience leaves unfinished and costs a strike', () => {
  const state = quietState({
    stalls: [{ car: car({ patience: 0.01 }), level: 0 }, ...withCars([0, 0, 0]).stalls],
  });
  const after = step(state, input(), 0.1, random);
  expect(after.stalls[0].car).toBeNull();
  expect(after.strikes).toBe(1);
  expect(after.served).toBe(0);
});

test('the breaker only heats above site capacity, and cools below it', () => {
  const atCapacity = withCars([3, 3, 0, 0]);
  expect(siteLoad(atCapacity)).toBe(SITE_CAPACITY);
  expect(step(atCapacity, input(), 1, random).heat).toBe(0);

  expect(step(withCars([3, 3, 3, 0]), input(), 1, random).heat).toBeGreaterThan(0);

  const cooling = withCars([1, 0, 0, 0], { heat: 0.5 });
  expect(step(cooling, input(), 1, random).heat).toBeLessThan(0.5);
});

test('a tripped breaker cuts every stall and locks the controls until it resets', () => {
  const tripped = step(withCars([3, 3, 3, 3], { heat: 0.999 }), input(), 1, random);
  expect(tripped.tripped).toBeGreaterThan(0);
  expect(siteLoad(tripped)).toBe(0);

  expect(setLevel(tripped, 0, 2)).toBe(tripped);

  const dark = step(tripped, input(), 1, random);
  expect(dark.stalls[0].car?.charged).toBe(tripped.stalls[0].car?.charged);

  const recovered = step(tripped, input(), TRIP_SECONDS, random);
  expect(recovered.tripped).toBe(0);
  expect(setLevel(recovered, 0, 2).stalls[0].level).toBe(2);
});

test('buttons move the selection and adjust power within limits', () => {
  const state = withCars([0, MAX_LEVEL, 0, 0]);
  expect(step(state, input(['left']), STEP_SECONDS, random).selected).toBe(0);
  expect(step(state, input(['right']), STEP_SECONDS, random).selected).toBe(1);
  expect(step(state, input(['up']), STEP_SECONDS, random).stalls[0].level).toBe(1);
  expect(step(state, input(['down']), STEP_SECONDS, random).stalls[0].level).toBe(0);

  const top = { ...state, selected: 1 };
  expect(step(top, input(['up']), STEP_SECONDS, random).stalls[1].level).toBe(MAX_LEVEL);
});

test('an empty stall cannot be given power', () => {
  const after = step(createState(), input(['up']), STEP_SECONDS, random);
  expect(after.stalls[0].level).toBe(0);
});

test('tapping a stall selects it, top half up and bottom half down', () => {
  const state = withCars([0, 2, 0, 0]);
  const { x, y, width, height } = stallBounds(1);
  const top = tapWorld(state, { x: x + width / 2, y: y + 0.1 });
  expect(top.selected).toBe(1);
  expect(top.stalls[1].level).toBe(3);

  const bottom = tapWorld(state, { x: x + width / 2, y: y + height - 0.1 });
  expect(bottom.stalls[1].level).toBe(1);

  expect(tapWorld(state, { x: 0.01, y: 0.01 })).toBe(state);
});

test('cars arrive in the first free stall, and arrive faster over time', () => {
  const state = quietState({ nextArrival: 0.01 });
  const after = step(state, input(), 0.1, random);
  expect(after.stalls[0].car).not.toBeNull();
  expect(arrivalGap(100)).toBeLessThan(arrivalGap(0));
});

test('a car arriving at a full site is a strike', () => {
  const after = step(withCars([1, 1, 1, 1], { nextArrival: 0.01 }), input(), 0.1, random);
  expect(after.strikes).toBe(1);
  expect(after.stalls.filter((stall) => stall.car)).toHaveLength(STALLS);
});

test('three strikes end the game', () => {
  expect(isOver(quietState({ strikes: MAX_STRIKES - 1 }))).toBe(false);
  expect(isOver(quietState({ strikes: MAX_STRIKES }))).toBe(true);
});
