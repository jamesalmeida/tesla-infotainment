import { Object3D, Vector3 } from 'three';
import {
  AZIMUTH_SMOOTH_TIME,
  CLOSED_DOORS,
  DOOR_IDS,
  createParts,
  doorAngle,
  doorNodeName,
  findDoorId,
  getPartTargets,
  isClick,
  nearestAngle,
  stepDamped,
  stepParts,
  type CarPart,
  type CarParts,
  type DoorStates,
  type VehiclePose,
} from './vehiclePose';

const FRAME = 1 / 60;

function settle(parts: CarParts, pose: VehiclePose, doors: DoorStates = CLOSED_DOORS) {
  const targets = getPartTargets(pose, doors);
  for (let frame = 0; frame < 600; frame++) {
    if (!stepParts(parts, targets, FRAME)) return frame;
  }
  throw new Error('parts never settled');
}

const values = (parts: CarParts) =>
  Object.fromEntries(Object.entries(parts).map(([part, { value }]) => [part, value]));

describe('poses', () => {
  it('reaches the Drive pose from an open frunk, closing it on the way', () => {
    const parts = createParts(getPartTargets('frunk', CLOSED_DOORS));
    settle(parts, 'drive');
    expect(values(parts)).toEqual(getPartTargets('drive', CLOSED_DOORS));
    expect(parts.frunk.value).toBe(0);
  });

  it('closes the trunk on the way to Drive', () => {
    const parts = createParts(getPartTargets('trunk', CLOSED_DOORS));
    settle(parts, 'drive');
    expect(parts.trunk.value).toBe(0);
  });

  it('opens only the compartment the pose names', () => {
    expect(getPartTargets('frunk', CLOSED_DOORS)).toMatchObject({ trunk: 0 });
    expect(getPartTargets('frunk', CLOSED_DOORS).frunk).toBeGreaterThan(0);
    expect(getPartTargets('trunk', CLOSED_DOORS)).toMatchObject({ frunk: 0 });
    expect(getPartTargets('trunk', CLOSED_DOORS).trunk).toBeLessThan(0);
  });

  it('settles and then reports nothing moving', () => {
    const parts = createParts(getPartTargets('park', CLOSED_DOORS));
    const targets = getPartTargets('trunk', CLOSED_DOORS);
    expect(stepParts(parts, targets, FRAME)).toBe(true);
    settle(parts, 'trunk');
    expect(stepParts(parts, targets, FRAME)).toBe(false);
  });
});

describe('moving parts independently', () => {
  it('leaves a door alone when the pose changes', () => {
    const doors = { ...CLOSED_DOORS, rf: true };
    const parts = createParts(getPartTargets('park', doors));
    const targets = getPartTargets('drive', doors);
    for (let frame = 0; frame < 30; frame++) stepParts(parts, targets, FRAME);
    expect(parts.rf.value).toBe(doorAngle('rf', true));
    expect(parts.rotation.value).not.toBe(targets.rotation);
  });

  it('never jumps when every target changes mid-move', () => {
    const parts = createParts(getPartTargets('park', CLOSED_DOORS));
    const scenes: [VehiclePose, DoorStates][] = [
      ['frunk', { ...CLOSED_DOORS, lf: true }],
      ['trunk', { ...CLOSED_DOORS, lf: true, rr: true }],
      ['drive', { ...CLOSED_DOORS, rr: true }],
      ['park', CLOSED_DOORS],
    ];
    for (const [pose, doors] of scenes) {
      const targets = getPartTargets(pose, doors);
      for (let frame = 0; frame < 12; frame++) {
        const before = values(parts);
        stepParts(parts, targets, FRAME);
        for (const part of Object.keys(parts) as CarPart[]) {
          expect(Math.abs(parts[part].value - before[part])).toBeLessThan(0.1);
        }
      }
    }
  });

  it('keeps moving the same way through an interruption', () => {
    const parts = createParts(getPartTargets('park', CLOSED_DOORS));
    const open = getPartTargets('frunk', CLOSED_DOORS);
    for (let frame = 0; frame < 15; frame++) stepParts(parts, open, FRAME);
    const velocity = parts.frunk.velocity;
    expect(velocity).toBeGreaterThan(0);
    stepParts(parts, getPartTargets('park', CLOSED_DOORS), FRAME);
    expect(parts.frunk.velocity).toBeGreaterThan(0);
    expect(parts.frunk.velocity).toBeLessThan(velocity);
  });
});

describe('stepDamped', () => {
  it('ignores the long delta of the first frame after idle', () => {
    const part = { value: 0, velocity: 0 };
    stepDamped(part, 1, AZIMUTH_SMOOTH_TIME, 30);
    expect(part.value).toBeLessThan(0.1);
  });

  it('does not overshoot', () => {
    const part = { value: 0, velocity: 0 };
    for (let frame = 0; frame < 300; frame++) {
      stepDamped(part, 1, AZIMUTH_SMOOTH_TIME, FRAME);
      expect(part.value).toBeLessThanOrEqual(1);
    }
    expect(part.value).toBe(1);
  });

  it('takes the same time at 30 and 120 frames a second', () => {
    const run = (delta: number) => {
      const part = { value: 0, velocity: 0 };
      for (let time = 0; time < 0.5; time += delta) stepDamped(part, 1, 0.5, delta);
      return part.value;
    };
    expect(run(1 / 30)).toBeCloseTo(run(1 / 120), 1);
  });
});

describe('doors', () => {
  // Hinge and rear-edge positions from the GLB: the hinge sits at the door's front edge.
  const hinges: Record<string, { x: number; y: number }> = {
    lf: { x: -1.006, y: 1.1753 },
    lr: { x: -1.0333, y: -0.1306 },
    rf: { x: 1.0058, y: 1.1753 },
    rr: { x: 1.0331, y: -0.1306 },
  };

  it.each(DOOR_IDS)('swings door %s outward', (door) => {
    const { x, y } = hinges[door];
    const rearEdge = new Vector3(0, -1.2, 0).applyAxisAngle(
      new Vector3(0, 0, 1),
      doorAngle(door, true),
    );
    expect(Math.abs(x + rearEdge.x)).toBeGreaterThan(Math.abs(x) + 0.5);
    expect(y + rearEdge.y).toBeGreaterThan(y - 1.2);
  });

  it('closes to zero on both sides', () => {
    expect(doorAngle('lf', false)).toBe(0);
    expect(doorAngle('rr', false)).toBe(0);
  });

  it('finds the door from a mesh two levels below its node', () => {
    const dummy = new Object3D();
    dummy.name = doorNodeName('lf');
    const door = new Object3D();
    door.name = 'door_lf';
    const mesh = new Object3D();
    mesh.name = 'door_lf_primary_0';
    dummy.add(door);
    door.add(mesh);
    expect(findDoorId(mesh)).toBe('lf');
  });

  it('finds no door for the rest of the car', () => {
    const chassis = new Object3D();
    chassis.name = 'chassis';
    const mesh = new Object3D();
    mesh.name = 'chassis_primary_0';
    chassis.add(mesh);
    expect(findDoorId(mesh)).toBeNull();
  });
});

describe('isClick', () => {
  it('treats a press with little travel as a click', () => {
    expect(isClick(0)).toBe(true);
    expect(isClick(6)).toBe(true);
  });

  it('treats a longer press as an orbit drag', () => {
    expect(isClick(7)).toBe(false);
  });
});

describe('nearestAngle', () => {
  it('keeps an angle already within half a turn', () => {
    expect(nearestAngle(1, 0.6)).toBeCloseTo(1);
  });

  it('wraps so the way back is the short way round', () => {
    expect(nearestAngle(-3, 3)).toBeCloseTo(-3 + 2 * Math.PI);
    expect(nearestAngle(3, -3)).toBeCloseTo(3 - 2 * Math.PI);
    expect(nearestAngle(0.6 + 4 * Math.PI, 0.6)).toBeCloseTo(0.6);
  });
});
