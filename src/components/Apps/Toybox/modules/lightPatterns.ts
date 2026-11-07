export const LAMPS = [
  'headLeft',
  'headRight',
  'sideLeft',
  'sideRight',
  'tailLeft',
  'tailRight',
] as const;
export type Lamp = (typeof LAMPS)[number];

export interface LightPattern {
  id: string;
  label: string;
  // Beats per minute of the pattern.
  bpm: number;
  // Each step lists the lamps lit on that beat.
  steps: Lamp[][];
}

const LEFT: Lamp[] = ['headLeft', 'sideLeft', 'tailLeft'];
const RIGHT: Lamp[] = ['headRight', 'sideRight', 'tailRight'];
const FRONT: Lamp[] = ['headLeft', 'headRight'];
const REAR: Lamp[] = ['tailLeft', 'tailRight'];
const SIDES: Lamp[] = ['sideLeft', 'sideRight'];

export const PATTERNS: LightPattern[] = [
  { id: 'sweep', label: 'Sweep', bpm: 120, steps: [FRONT, SIDES, REAR, SIDES] },
  { id: 'ping-pong', label: 'Ping pong', bpm: 150, steps: [LEFT, RIGHT] },
  {
    id: 'pulse',
    label: 'Pulse',
    bpm: 90,
    steps: [[...LEFT, ...RIGHT], [], [...FRONT, ...REAR], []],
  },
  {
    id: 'chase',
    label: 'Chase',
    bpm: 180,
    steps: [['headLeft'], ['headRight'], ['sideRight'], ['tailRight'], ['tailLeft'], ['sideLeft']],
  },
];

export const stepAt = (pattern: LightPattern, seconds: number): number =>
  Math.floor((seconds * pattern.bpm) / 60) % pattern.steps.length;

export const litLamps = (pattern: LightPattern, seconds: number): Lamp[] =>
  pattern.steps[stepAt(pattern, seconds)];
