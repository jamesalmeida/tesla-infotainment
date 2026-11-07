import { createRandom, STEP_SECONDS, type GameButton, type GameInput } from '../runtime';
import {
  CRASH_CHARGE,
  LANES,
  PAD_CHARGE,
  PLAYER_X,
  REGEN_CHARGE,
  chargeChange,
  createState,
  isOver,
  spawnWave,
  step,
  type Entity,
  type KilowattState,
} from './rules';

const input = (held: GameButton[] = [], pressed: GameButton[] = []): GameInput => ({
  held: new Set(held),
  pressed: new Set(pressed),
});
const random = createRandom(1);
// A state with no traffic due, so each test only sees what it set up.
const quietState = (overrides: Partial<KilowattState> = {}): KilowattState => ({
  ...createState(),
  nextWave: 1000,
  ...overrides,
});
const onPlayer = (kind: Entity['kind'], lane = 1): Entity => ({ id: 1, kind, lane, x: PLAYER_X });

test('the battery drains while cruising and drains faster on boost', () => {
  const cruising = step(quietState(), input(), 1, random);
  const boosting = step(quietState(), input(['right']), 1, random);
  expect(cruising.charge).toBeLessThan(100);
  expect(boosting.charge).toBeLessThan(cruising.charge);
});

test('regen braking adds charge and slows the car', () => {
  const cruising = step(quietState({ charge: 50 }), input(), 1, random);
  const regen = step(quietState({ charge: 50 }), input(['left']), 1, random);
  expect(regen.charge).toBeCloseTo(50 + REGEN_CHARGE);
  expect(regen.speed).toBeLessThan(cruising.speed);
  expect(regen.distance).toBeLessThan(cruising.distance);
});

test('draining gets harder the longer you drive', () => {
  expect(chargeChange('cruise', 120)).toBeLessThan(chargeChange('cruise', 0));
});

test('the car changes one lane per press and stops at the edges of the road', () => {
  expect(step(quietState(), input([], ['up']), STEP_SECONDS, random).lane).toBe(0);
  expect(step(quietState({ lane: 0 }), input([], ['up']), STEP_SECONDS, random).lane).toBe(0);
  const bottom = quietState({ lane: LANES - 1 });
  expect(step(bottom, input([], ['down']), STEP_SECONDS, random).lane).toBe(LANES - 1);
});

test('holding a lane button does not keep changing lanes', () => {
  expect(step(quietState(), input(['up']), STEP_SECONDS, random).lane).toBe(1);
});

test('hitting traffic costs charge, then the car gets a moment of grace', () => {
  const state = quietState({ charge: 60, entities: [onPlayer('car')] });
  const hit = step(state, input(), STEP_SECONDS, random);
  expect(hit.charge).toBeLessThan(60 - CRASH_CHARGE + 0.1);
  expect(hit.grace).toBeGreaterThan(0);

  const stillTouching = step(hit, input(), STEP_SECONDS, random);
  expect(stillTouching.charge).toBeGreaterThan(hit.charge - 1);
});

test('traffic in another lane misses', () => {
  const state = quietState({ charge: 60, entities: [onPlayer('truck', 3)] });
  expect(step(state, input(), STEP_SECONDS, random).grace).toBe(0);
});

test('a charge pad tops up the battery and is used up, never going over 100', () => {
  const state = quietState({ charge: 50, entities: [onPlayer('pad')] });
  const charged = step(state, input(), STEP_SECONDS, random);
  expect(charged.charge).toBeGreaterThan(50 + PAD_CHARGE - 1);
  expect(charged.entities).toHaveLength(0);

  const full = quietState({ charge: 95, entities: [onPlayer('pad')] });
  expect(step(full, input(), STEP_SECONDS, random).charge).toBe(100);
});

test('every wave leaves at least one lane free of vehicles', () => {
  const seeded = createRandom(42);
  for (let wave = 0; wave < 500; wave += 1) {
    const { entities } = spawnWave(quietState({ elapsed: 300 }), seeded);
    const blocked = new Set(entities.filter((e) => e.kind !== 'pad').map((e) => e.lane));
    expect(blocked.size).toBeLessThan(LANES);
  }
});

test('a flat battery ends the game', () => {
  expect(isOver(createState())).toBe(false);
  const state = quietState({ charge: 0.01 });
  expect(isOver(step(state, input(), 1, random))).toBe(true);
});

test('the same seed and inputs replay exactly', () => {
  const run = () => {
    const seeded = createRandom(9);
    let state = createState();
    for (let frame = 0; frame < 600; frame += 1) {
      state = step(state, input(), STEP_SECONDS, seeded);
    }
    return state;
  };
  expect(run()).toEqual(run());
});
