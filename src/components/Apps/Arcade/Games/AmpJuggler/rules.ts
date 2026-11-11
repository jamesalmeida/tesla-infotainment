import { clamp, type GameInput, type Point, type Random } from '../runtime';

export const WORLD_WIDTH = 16;
export const WORLD_HEIGHT = 7;
export const HEADER_HEIGHT = 1.1;

export const STALLS = 4;
export const MAX_LEVEL = 3;
// The site can only feed this many power levels at once without heating the breaker.
export const SITE_CAPACITY = 6;
export const MAX_STRIKES = 3;

const KWH_PER_LEVEL = 2.5; // per second
const NEED_MIN = 30;
const NEED_MAX = 70;
const PATIENCE_MIN = 16;
const PATIENCE_MAX = 24;
const FIRST_ARRIVAL = 1;
const ARRIVAL_START = 6;
const ARRIVAL_FASTEST = 2.6;
const ARRIVAL_SPEEDUP = 0.03; // seconds shaved off the gap, per second played

const HEAT_PER_OVERLOAD = 0.14; // per level over capacity, per second
const COOLING = 0.2; // per second
export const TRIP_SECONDS = 4;
const HEAT_AFTER_TRIP = 0.4;

const POINTS_PER_CAR = 10;

export interface Car {
  id: number;
  need: number; // kWh
  charged: number; // kWh
  patience: number; // seconds left
  fullPatience: number;
}

export interface Stall {
  car: Car | null;
  level: number;
}

export interface AmpState {
  stalls: Stall[];
  selected: number;
  heat: number; // 0 to 1
  tripped: number; // seconds of blackout left
  score: number;
  served: number;
  strikes: number;
  elapsed: number;
  nextArrival: number;
  nextId: number;
}

export const createState = (): AmpState => ({
  stalls: Array.from({ length: STALLS }, () => ({ car: null, level: 0 })),
  selected: 0,
  heat: 0,
  tripped: 0,
  score: 0,
  served: 0,
  strikes: 0,
  elapsed: 0,
  nextArrival: FIRST_ARRIVAL,
  nextId: 1,
});

export const siteLoad = (state: AmpState): number =>
  state.stalls.reduce((load, stall) => load + stall.level, 0);

export const arrivalGap = (elapsed: number): number =>
  Math.max(ARRIVAL_FASTEST, ARRIVAL_START - elapsed * ARRIVAL_SPEEDUP);

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

const replaceStall = (stalls: Stall[], index: number, stall: Stall): Stall[] =>
  stalls.map((current, position) => (position === index ? stall : current));

export const setLevel = (state: AmpState, stall: number, level: number): AmpState => {
  const current = state.stalls[stall];
  if (state.tripped > 0 || !current.car) return state;
  const next = { ...current, level: clamp(level, 0, MAX_LEVEL) };
  return { ...state, stalls: replaceStall(state.stalls, stall, next) };
};

const applyButtons = (state: AmpState, input: GameInput): AmpState => {
  let selected = state.selected;
  if (input.pressed.has('left')) selected -= 1;
  if (input.pressed.has('right')) selected += 1;
  selected = clamp(selected, 0, STALLS - 1);

  const next = { ...state, selected };
  const stall = next.stalls[selected];
  if (input.pressed.has('up')) return setLevel(next, selected, stall.level + 1);
  if (input.pressed.has('down')) return setLevel(next, selected, stall.level - 1);
  return next;
};

// Charges every car, sends the finished and the fed-up on their way.
const serveStalls = (state: AmpState, seconds: number): AmpState => {
  let { score, served, strikes } = state;

  const stalls = state.stalls.map((stall) => {
    if (!stall.car) return stall;
    const charged = stall.car.charged + stall.level * KWH_PER_LEVEL * seconds;
    const patience = stall.car.patience - seconds;

    if (charged >= stall.car.need) {
      score += POINTS_PER_CAR + Math.round(Math.max(0, patience));
      served += 1;
      return { car: null, level: 0 };
    }
    if (patience <= 0) {
      strikes += 1;
      return { car: null, level: 0 };
    }
    return { ...stall, car: { ...stall.car, charged, patience } };
  });

  return { ...state, stalls, score, served, strikes };
};

// Running over capacity heats the breaker. When it trips, the whole site goes dark for a while.
const updateBreaker = (state: AmpState, seconds: number): AmpState => {
  if (state.tripped > 0) {
    return { ...state, tripped: Math.max(0, state.tripped - seconds) };
  }

  const overload = siteLoad(state) - SITE_CAPACITY;
  const heat =
    overload > 0
      ? state.heat + overload * HEAT_PER_OVERLOAD * seconds
      : Math.max(0, state.heat - COOLING * seconds);

  if (heat < 1) return { ...state, heat };
  return {
    ...state,
    heat: HEAT_AFTER_TRIP,
    tripped: TRIP_SECONDS,
    stalls: state.stalls.map((stall) => ({ ...stall, level: 0 })),
  };
};

// A car turns up in the first free stall. With nowhere to plug in, the driver leaves.
const admitArrivals = (state: AmpState, seconds: number, random: Random): AmpState => {
  const nextArrival = state.nextArrival - seconds;
  if (nextArrival > 0) return { ...state, nextArrival };

  const gap = arrivalGap(state.elapsed);
  const free = state.stalls.findIndex((stall) => !stall.car);
  if (free === -1) {
    return { ...state, nextArrival: gap, strikes: state.strikes + 1 };
  }

  const patience = between(random, PATIENCE_MIN, PATIENCE_MAX);
  const car: Car = {
    id: state.nextId,
    need: between(random, NEED_MIN, NEED_MAX),
    charged: 0,
    patience,
    fullPatience: patience,
  };
  return {
    ...state,
    stalls: replaceStall(state.stalls, free, { car, level: 0 }),
    nextArrival: gap,
    nextId: state.nextId + 1,
  };
};

export const step = (
  state: AmpState,
  input: GameInput,
  seconds: number,
  random: Random,
): AmpState => {
  const controlled = applyButtons({ ...state, elapsed: state.elapsed + seconds }, input);
  const served = serveStalls(controlled, seconds);
  return admitArrivals(updateBreaker(served, seconds), seconds, random);
};

export const stallBounds = (index: number) => {
  const margin = 0.2;
  const width = (WORLD_WIDTH - margin * (STALLS + 1)) / STALLS;
  return {
    x: margin + index * (width + margin),
    y: HEADER_HEIGHT,
    width,
    height: WORLD_HEIGHT - HEADER_HEIGHT - margin,
  };
};

// Tapping a stall selects it: the top half adds power and the bottom half takes it away.
export const tapWorld = (state: AmpState, point: Point): AmpState => {
  for (let index = 0; index < STALLS; index += 1) {
    const { x, y, width, height } = stallBounds(index);
    if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) continue;
    const change = point.y < y + height / 2 ? 1 : -1;
    return setLevel({ ...state, selected: index }, index, state.stalls[index].level + change);
  }
  return state;
};

export const isOver = (state: AmpState): boolean => state.strikes >= MAX_STRIKES;
