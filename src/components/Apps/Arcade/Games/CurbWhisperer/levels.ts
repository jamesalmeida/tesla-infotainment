export interface Pose {
  x: number;
  y: number;
  heading: number; // radians, 0 points right and clockwise is positive
}

export interface Box extends Pose {
  length: number; // along the heading
  width: number;
}

export type ObstacleKind = 'car' | 'pillar' | 'wall';

export interface Obstacle extends Box {
  kind: ObstacleKind;
}

export interface Level {
  name: string;
  start: Pose;
  // The bay's heading is the way the car must face once parked.
  bay: Box;
  obstacles: Obstacle[];
}

const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;
const STALL_LENGTH = 2.8;
const STALL_WIDTH = 1.5;

const parkedCar = (x: number, y: number, heading: number): Obstacle => ({
  x,
  y,
  heading,
  length: 1.9,
  width: 0.95,
  kind: 'car',
});

const pillar = (x: number, y: number): Obstacle => ({
  x,
  y,
  heading: 0,
  length: 0.7,
  width: 0.7,
  kind: 'pillar',
});

const wall = (x: number, y: number, length: number, width: number): Obstacle => ({
  x,
  y,
  heading: 0,
  length,
  width,
  kind: 'wall',
});

export const LEVELS: Level[] = [
  {
    name: 'Nose in',
    start: { x: 3, y: 6, heading: 0 },
    bay: { x: 12, y: 1.5, heading: UP, length: STALL_LENGTH, width: 1.8 },
    obstacles: [parkedCar(9.9, 1.5, UP), parkedCar(14.1, 1.5, DOWN)],
  },
  {
    name: 'Back it in',
    start: { x: 3, y: 6, heading: 0 },
    bay: { x: 10, y: 1.5, heading: DOWN, length: STALL_LENGTH, width: 1.7 },
    obstacles: [
      parkedCar(8, 1.5, UP),
      parkedCar(12, 1.5, UP),
      parkedCar(6.2, 1.5, DOWN),
      parkedCar(13.8, 1.5, DOWN),
    ],
  },
  {
    name: 'Curbside',
    start: { x: 2.5, y: 3.4, heading: 0 },
    bay: { x: 10, y: 0.9, heading: 0, length: 3.6, width: 1.4 },
    obstacles: [parkedCar(7, 0.9, 0), parkedCar(13, 0.9, 0), parkedCar(4.8, 0.9, 0)],
  },
  {
    name: 'On the slant',
    start: { x: 17, y: 6.2, heading: Math.PI },
    bay: { x: 9, y: 1.9, heading: -Math.PI * 0.75, length: STALL_LENGTH, width: STALL_WIDTH + 0.2 },
    obstacles: [
      parkedCar(6.6, 1.9, -Math.PI * 0.75),
      parkedCar(11.4, 1.9, -Math.PI * 0.75),
      parkedCar(13.8, 1.9, -Math.PI * 0.75),
    ],
  },
  {
    name: 'Basement',
    start: { x: 2, y: 6.6, heading: 0 },
    bay: { x: 17.4, y: 1.6, heading: DOWN, length: STALL_LENGTH, width: 1.6 },
    obstacles: [
      wall(8, 2.6, 9, 0.4),
      pillar(6, 5),
      pillar(10.5, 4.4),
      pillar(14, 5.8),
      parkedCar(15.5, 1.6, UP),
      parkedCar(19.2, 1.6, UP),
    ],
  },
];
