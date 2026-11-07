import { approach, type GameInput, type Point } from '../runtime';
import { LEVELS, type Box, type Level, type Pose } from './levels';

export const WORLD_WIDTH = 20;
export const WORLD_HEIGHT = 8;

export const CAR_LENGTH = 1.9;
export const CAR_WIDTH = 0.95;
const WHEELBASE = 1.3;
const MAX_STEER_ANGLE = 0.6; // radians at the front wheels

const FORWARD_SPEED = 3.4;
const REVERSE_SPEED = 2.4;
const ACCELERATION = 3.2;
const BRAKING = 7;
const COASTING = 2.6;
const STEER_RATE = 3.6; // full lock is 1

const BOUNCE = 0.3;
const SCUFF_GRACE = 0.8; // seconds
export const MAX_SCUFFS = 5;

const STOPPED_SPEED = 0.2;
const SETTLE_SECONDS = 0.5;
const HEADING_TOLERANCE = 0.45; // radians
const CELEBRATE_SECONDS = 1.2;

const BEST_LEVEL_SCORE = 300;
const WORST_LEVEL_SCORE = 50;
const POINTS_LOST_PER_SECOND = 5;

export interface CurbState {
  level: number;
  car: Pose;
  speed: number;
  steer: number; // -1 full left to 1 full right
  scuffs: number;
  scuffGrace: number;
  // How long the car has sat still in the bay.
  settled: number;
  levelTime: number;
  score: number;
  // Seconds of "Parked!" left before the next level.
  celebrating: number;
  won: boolean;
}

const startLevel = (index: number) => ({
  level: index,
  car: LEVELS[index].start,
  speed: 0,
  steer: 0,
  settled: 0,
  levelTime: 0,
  scuffGrace: 0,
  celebrating: 0,
});

export const createState = (): CurbState => ({
  ...startLevel(0),
  scuffs: 0,
  score: 0,
  won: false,
});

export const carBox = (car: Pose): Box => ({ ...car, length: CAR_LENGTH, width: CAR_WIDTH });

export const boxCorners = ({ x, y, heading, length, width }: Box): Point[] => {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return [
    [length / 2, width / 2],
    [length / 2, -width / 2],
    [-length / 2, -width / 2],
    [-length / 2, width / 2],
  ].map(([along, across]) => ({
    x: x + along * cos - across * sin,
    y: y + along * sin + across * cos,
  }));
};

// Separating axis test for two rotated rectangles.
export const boxesOverlap = (first: Box, second: Box): boolean => {
  const firstCorners = boxCorners(first);
  const secondCorners = boxCorners(second);
  const axes = [
    first.heading,
    first.heading + Math.PI / 2,
    second.heading,
    second.heading + Math.PI / 2,
  ];

  return axes.every((angle) => {
    const axisX = Math.cos(angle);
    const axisY = Math.sin(angle);
    const project = (corners: Point[]) => corners.map((c) => c.x * axisX + c.y * axisY);
    const firstSpan = project(firstCorners);
    const secondSpan = project(secondCorners);
    return (
      Math.max(...firstSpan) > Math.min(...secondSpan) &&
      Math.max(...secondSpan) > Math.min(...firstSpan)
    );
  });
};

export const boxContains = (outer: Box, point: Point): boolean => {
  const cos = Math.cos(outer.heading);
  const sin = Math.sin(outer.heading);
  const dx = point.x - outer.x;
  const dy = point.y - outer.y;
  const along = dx * cos + dy * sin;
  const across = -dx * sin + dy * cos;
  return Math.abs(along) <= outer.length / 2 && Math.abs(across) <= outer.width / 2;
};

const angleBetween = (first: number, second: number): number =>
  Math.abs(Math.atan2(Math.sin(first - second), Math.cos(first - second)));

// In the bay, and pointing the right way so the charge port reaches the post.
export const isInBay = (car: Pose, bay: Box): boolean =>
  angleBetween(car.heading, bay.heading) < HEADING_TOLERANCE &&
  boxCorners(carBox(car)).every((corner) => boxContains(bay, corner));

export const hitsSomething = (car: Pose, level: Level): boolean => {
  const box = carBox(car);
  const leavesLot = boxCorners(box).some(
    ({ x, y }) => x < 0 || y < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT,
  );
  return leavesLot || level.obstacles.some((obstacle) => boxesOverlap(box, obstacle));
};

// Bicycle model: the car turns around its rear axle, tighter the more the wheels are turned.
export const drive = (car: Pose, speed: number, steer: number, seconds: number): Pose => {
  const heading = car.heading + (speed / WHEELBASE) * Math.tan(steer * MAX_STEER_ANGLE) * seconds;
  return {
    x: car.x + Math.cos(heading) * speed * seconds,
    y: car.y + Math.sin(heading) * speed * seconds,
    heading,
  };
};

const nextSpeed = (speed: number, input: GameInput, seconds: number): number => {
  const throttle = Number(input.held.has('up')) - Number(input.held.has('down'));
  if (throttle === 0) return approach(speed, 0, COASTING * seconds);
  const target = throttle > 0 ? FORWARD_SPEED : -REVERSE_SPEED;
  const isBraking = speed !== 0 && Math.sign(speed) !== throttle;
  return approach(speed, target, (isBraking ? BRAKING : ACCELERATION) * seconds);
};

const nextSteer = (steer: number, input: GameInput, seconds: number): number => {
  const target = Number(input.held.has('right')) - Number(input.held.has('left'));
  return approach(steer, target, STEER_RATE * seconds);
};

export const levelScore = (seconds: number): number =>
  Math.max(WORST_LEVEL_SCORE, Math.round(BEST_LEVEL_SCORE - seconds * POINTS_LOST_PER_SECOND));

const celebrate = (state: CurbState, seconds: number): CurbState => {
  const celebrating = state.celebrating - seconds;
  if (celebrating > 0) return { ...state, celebrating };
  const nextLevel = state.level + 1;
  if (nextLevel >= LEVELS.length) return { ...state, celebrating: 0, won: true };
  return { ...state, ...startLevel(nextLevel) };
};

export const step = (state: CurbState, input: GameInput, seconds: number): CurbState => {
  if (state.celebrating > 0) return celebrate(state, seconds);

  const level = LEVELS[state.level];
  const speed = nextSpeed(state.speed, input, seconds);
  const steer = nextSteer(state.steer, input, seconds);
  const moved = drive(state.car, speed, steer, seconds);
  const scuffGrace = Math.max(0, state.scuffGrace - seconds);
  const levelTime = state.levelTime + seconds;

  if (hitsSomething(moved, level)) {
    const isNewScuff = scuffGrace === 0;
    return {
      ...state,
      speed: -speed * BOUNCE,
      steer,
      levelTime,
      settled: 0,
      scuffs: state.scuffs + Number(isNewScuff),
      scuffGrace: isNewScuff ? SCUFF_GRACE : scuffGrace,
    };
  }

  const isSettling = Math.abs(speed) < STOPPED_SPEED && isInBay(moved, level.bay);
  const settled = isSettling ? state.settled + seconds : 0;
  const next = { ...state, car: moved, speed, steer, scuffGrace, levelTime, settled };

  if (settled < SETTLE_SECONDS) return next;
  return {
    ...next,
    speed: 0,
    score: state.score + levelScore(levelTime),
    celebrating: CELEBRATE_SECONDS,
  };
};

export const isOver = (state: CurbState): boolean => state.won || state.scuffs >= MAX_SCUFFS;
