import { approach, clamp, type GameInput, type Random } from '../runtime';

export const WORLD_WIDTH = 16;
export const WORLD_HEIGHT = 6;
export const LANES = 4;
export const LANE_HEIGHT = WORLD_HEIGHT / LANES;

export const PLAYER_X = 2.6;
export const CAR_LENGTH = 2;
export const TRUCK_LENGTH = 3.4;
export const PAD_LENGTH = 1;

const LANE_CHANGE_RATE = 8; // lanes per second
const HIT_LANE_GAP = 0.6; // lanes
const HIT_FORGIVENESS = 0.2; // world units trimmed off each hit

const START_SPEED = 7;
const TOP_SPEED = 15;
const SPEED_GAIN = 0.05; // per second of driving
const TRAFFIC_SHARE = 0.35; // traffic drives at this share of our speed

export const BOOST_SPEED = 1.5;
export const REGEN_SPEED = 0.6;

const BASE_DRAIN = 2.6; // percent per second
const DRAIN_GROWTH = 0.008; // extra percent per second, per second driven
const BOOST_DRAIN = 2.6;
export const REGEN_CHARGE = 1.6; // percent per second gained while regen braking
export const PAD_CHARGE = 20;
export const CRASH_CHARGE = 20;
const CRASH_GRACE = 1.4; // seconds

const KM_PER_WORLD_UNIT = 0.02;
const WAVE_GAP_MIN = 7;
const WAVE_GAP_MAX = 11;
const PAD_CHANCE = 0.55;

export type DriveMode = 'cruise' | 'boost' | 'regen';
export type EntityKind = 'car' | 'truck' | 'pad';

export interface Entity {
  id: number;
  kind: EntityKind;
  lane: number;
  x: number;
}

export interface KilowattState {
  lane: number;
  // Where the car is between lanes while it changes.
  laneY: number;
  mode: DriveMode;
  speed: number;
  charge: number;
  distance: number; // km
  elapsed: number;
  // World units left until the next wave of traffic.
  nextWave: number;
  grace: number;
  entities: Entity[];
  nextId: number;
  roadScroll: number;
}

export const createState = (): KilowattState => ({
  lane: 1,
  laneY: 1,
  mode: 'cruise',
  speed: START_SPEED,
  charge: 100,
  distance: 0,
  elapsed: 0,
  nextWave: 0,
  grace: 0,
  entities: [],
  nextId: 1,
  roadScroll: 0,
});

export const entityLength = (kind: EntityKind): number => {
  if (kind === 'truck') return TRUCK_LENGTH;
  return kind === 'car' ? CAR_LENGTH : PAD_LENGTH;
};

export const driveMode = (input: GameInput): DriveMode => {
  if (input.held.has('left')) return 'regen';
  return input.held.has('right') ? 'boost' : 'cruise';
};

export const cruiseSpeed = (elapsed: number): number =>
  Math.min(TOP_SPEED, START_SPEED + elapsed * SPEED_GAIN);

export const modeSpeed = (cruise: number, mode: DriveMode): number => {
  if (mode === 'boost') return cruise * BOOST_SPEED;
  return mode === 'regen' ? cruise * REGEN_SPEED : cruise;
};

export const chargeChange = (mode: DriveMode, elapsed: number): number => {
  if (mode === 'regen') return REGEN_CHARGE;
  const drain = BASE_DRAIN + elapsed * DRAIN_GROWTH;
  return mode === 'boost' ? -(drain + BOOST_DRAIN) : -drain;
};

// How fast something on the road closes on us: traffic is moving too, pads aren't.
const closingSpeed = (kind: EntityKind, speed: number, cruise: number): number =>
  kind === 'pad' ? speed : speed - cruise * TRAFFIC_SHARE;

const overlaps = (state: KilowattState, entity: Entity): boolean => {
  if (Math.abs(entity.lane - state.laneY) >= HIT_LANE_GAP) return false;
  const reach = (CAR_LENGTH + entityLength(entity.kind)) / 2 - HIT_FORGIVENESS;
  return Math.abs(entity.x - PLAYER_X) < reach;
};

// One wave of traffic. It never fills every lane, so there is always a way through.
export const spawnWave = (state: KilowattState, random: Random): KilowattState => {
  const openLanes = Array.from({ length: LANES }, (_, lane) => lane);
  const take = () => openLanes.splice(Math.floor(random() * openLanes.length), 1)[0];

  const maxVehicles = state.elapsed > 30 ? LANES - 1 : LANES - 2;
  const vehicles = 1 + Math.floor(random() * maxVehicles);
  const entities = [...state.entities];
  let nextId = state.nextId;
  const x = WORLD_WIDTH + TRUCK_LENGTH;

  for (let count = 0; count < vehicles; count += 1) {
    const kind = random() < 0.25 ? 'truck' : 'car';
    entities.push({ id: nextId, kind, lane: take(), x });
    nextId += 1;
  }

  if (random() < PAD_CHANCE) {
    entities.push({ id: nextId, kind: 'pad', lane: take(), x });
    nextId += 1;
  }

  const nextWave = WAVE_GAP_MIN + random() * (WAVE_GAP_MAX - WAVE_GAP_MIN);
  return { ...state, entities, nextId, nextWave };
};

export const step = (
  state: KilowattState,
  input: GameInput,
  seconds: number,
  random: Random,
): KilowattState => {
  const lastLane = LANES - 1;
  let lane = state.lane;
  if (input.pressed.has('up')) lane -= 1;
  if (input.pressed.has('down')) lane += 1;
  lane = clamp(lane, 0, lastLane);

  const mode = driveMode(input);
  const elapsed = state.elapsed + seconds;
  const cruise = cruiseSpeed(elapsed);
  const speed = modeSpeed(cruise, mode);

  let next: KilowattState = {
    ...state,
    lane,
    laneY: approach(state.laneY, lane, LANE_CHANGE_RATE * seconds),
    mode,
    speed,
    elapsed,
    charge: clamp(state.charge + chargeChange(mode, elapsed) * seconds, 0, 100),
    distance: state.distance + speed * seconds * KM_PER_WORLD_UNIT,
    grace: Math.max(0, state.grace - seconds),
    roadScroll: state.roadScroll + speed * seconds,
    entities: state.entities
      .map((entity) => ({
        ...entity,
        x: entity.x - closingSpeed(entity.kind, speed, cruise) * seconds,
      }))
      .filter((entity) => entity.x > -TRUCK_LENGTH),
    nextWave: state.nextWave - (speed - cruise * TRAFFIC_SHARE) * seconds,
  };

  for (const entity of next.entities) {
    if (!overlaps(next, entity)) continue;
    if (entity.kind === 'pad') {
      next = {
        ...next,
        charge: Math.min(100, next.charge + PAD_CHARGE),
        entities: next.entities.filter((other) => other.id !== entity.id),
      };
    } else if (next.grace === 0) {
      next = {
        ...next,
        charge: Math.max(0, next.charge - CRASH_CHARGE),
        grace: CRASH_GRACE,
      };
    }
  }

  return next.nextWave <= 0 ? spawnWave(next, random) : next;
};

export const isOver = (state: KilowattState): boolean => state.charge <= 0;
