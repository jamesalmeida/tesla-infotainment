// The model is Z-up: +X is the car's right, +Y its front. Each animated part is a node
// with an identity rest rotation, so an angle here is the node's rotation on one axis.

import { CLOSED_DOORS, DOOR_IDS, type DoorId, type DoorStates } from '../../state/doors';

export type { DoorId, DoorStates };
export { CLOSED_DOORS, DOOR_IDS };

export type VehiclePose = 'park' | 'drive' | 'frunk' | 'trunk';

export type CarPart = 'rotation' | 'frunk' | 'trunk' | DoorId;

// Where the camera rests around the car, in radians. A drag orbits away and the car stays
// where it was left, then eases back after a few seconds, as on the car.
export const DEFAULT_AZIMUTH = 0.6;
export const AZIMUTH_RETURN_DELAY_MS = 4000;

const degrees = (value: number) => (value * Math.PI) / 180;

// How high the camera sits, as an angle above the ground looking at the car. The car looks
// at itself from low down: a little above the roof beside the map, nearly level with the
// car when it has the whole screen. Following it in Drive, the camera is higher, so the
// road ahead shows.
export const PANEL_ELEVATION = degrees(15);
export const PARK_VIEW_ELEVATION = degrees(5);
// With the whole screen, the camera also comes further round the side, so more of the flank
// and the rear corner show.
export const PARK_VIEW_AZIMUTH = DEFAULT_AZIMUTH + degrees(4);
export const DRIVE_ELEVATION = Math.PI / 5.14;
// A vertical drag can raise or lower the camera this far, then it eases back with the spin.
export const MIN_ELEVATION = degrees(1);
export const MAX_ELEVATION = degrees(50);

// How long a part takes to get most of the way to its target, in seconds.
export const AZIMUTH_SMOOTH_TIME = 0.35;
const SMOOTH_TIMES: Record<CarPart, number> = {
  rotation: 0.5,
  frunk: 0.4,
  trunk: 0.4,
  lf: 0.3,
  lr: 0.3,
  rf: 0.3,
  rr: 0.3,
};

// Under demand rendering, the first frame after an idle spell reports the whole spell as
// its delta. Without this cap a part would leap most of the way to its target.
const MAX_FRAME_DELTA = 0.05;

const SETTLE_EPSILON = 0.0005;

// Pointer travel in pixels past which a press on the car is an orbit drag, not a click.
const MAX_CLICK_TRAVEL = 6;

const DOOR_OPEN_ANGLE = (65 * Math.PI) / 180;

const POSE_TARGETS: Record<VehiclePose, { rotation: number; frunk: number; trunk: number }> = {
  park: { rotation: Math.PI, frunk: 0, trunk: 0 },
  // Seen from straight behind, as if following the car: turned to match the camera, so it
  // points up the screen rather than off to one side.
  drive: { rotation: DEFAULT_AZIMUTH, frunk: 0, trunk: 0 },
  // The parked view already shows the frunk. It opens 30 degrees.
  frunk: { rotation: Math.PI, frunk: Math.PI / 6, trunk: 0 },
  // A quarter turn from parked brings the rear round. The lid opens about 51 degrees,
  // negative because its hinge is at the front of the lid.
  trunk: { rotation: Math.PI / 2, frunk: 0, trunk: -Math.PI / 3.5 },
};

export function doorNodeName(door: DoorId) {
  return `door_${door}_dummy`;
}

// All four doors hinge at their front edge, so a door's rear edge swings outward when
// left doors turn clockwise about +Z and right doors anticlockwise.
export function doorAngle(door: DoorId, isOpen: boolean) {
  if (!isOpen) return 0;
  return door.startsWith('l') ? -DOOR_OPEN_ANGLE : DOOR_OPEN_ANGLE;
}

export function getPartTargets(pose: VehiclePose, doors: DoorStates): Record<CarPart, number> {
  return {
    ...POSE_TARGETS[pose],
    lf: doorAngle('lf', doors.lf),
    lr: doorAngle('lr', doors.lr),
    rf: doorAngle('rf', doors.rf),
    rr: doorAngle('rr', doors.rr),
  };
}

export interface Damped {
  value: number;
  velocity: number;
}

export type CarParts = Record<CarPart, Damped>;

export function createParts(targets: Record<CarPart, number>): CarParts {
  const at = (value: number): Damped => ({ value, velocity: 0 });
  return {
    rotation: at(targets.rotation),
    frunk: at(targets.frunk),
    trunk: at(targets.trunk),
    lf: at(targets.lf),
    lr: at(targets.lr),
    rf: at(targets.rf),
    rr: at(targets.rr),
  };
}

// One step of a critically damped spring. It keeps the part's velocity, so a target that
// changes mid-move bends the motion instead of restarting it. Returns true while moving.
export function stepDamped(part: Damped, target: number, smoothTime: number, delta: number) {
  const dt = Math.min(delta, MAX_FRAME_DELTA);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const offset = part.value - target;
  const pull = (part.velocity + omega * offset) * dt;
  part.velocity = (part.velocity - omega * pull) * decay;
  part.value = target + (offset + pull) * decay;

  if (Math.abs(part.value - target) < SETTLE_EPSILON && Math.abs(part.velocity) < SETTLE_EPSILON) {
    part.value = target;
    part.velocity = 0;
    return false;
  }
  return true;
}

// Moves every part one frame towards its target. Returns true while any part is moving.
export function stepParts(parts: CarParts, targets: Record<CarPart, number>, delta: number) {
  let isMoving = false;
  for (const key of Object.keys(parts) as CarPart[]) {
    if (stepDamped(parts[key], targets[key], SMOOTH_TIMES[key], delta)) isMoving = true;
  }
  return isMoving;
}

// The door a clicked mesh belongs to. The meshes sit below the door node, not on it.
export function findDoorId(object: { name: string; parent: unknown } | null): DoorId | null {
  for (let node = object; node; node = node.parent as typeof object) {
    const door = DOOR_IDS.find((id) => doorNodeName(id) === node?.name);
    if (door) return door;
  }
  return null;
}

export function isClick(pointerTravel: number) {
  return pointerTravel <= MAX_CLICK_TRAVEL;
}

// The equivalent of `angle` that lies within half a turn of `reference`.
export function nearestAngle(angle: number, reference: number) {
  const turn = 2 * Math.PI;
  const difference = (((angle - reference + Math.PI) % turn) + turn) % turn;
  return reference + difference - Math.PI;
}

// The axle groups that spin with speed. Neither may be an ancestor of the other, or spinning
// one would carry the other around with it.
export const SPINNING_WHEEL_NODES = ['wheels', 'wheels.001'] as const;
