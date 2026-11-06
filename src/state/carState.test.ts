import {
  activeApp,
  canShift,
  carReducer,
  initialCarState,
  isCameraForced,
  isPanelOpen,
  isSimulationActive,
  leftSignalLit,
  rightSignalLit,
  vehiclePower,
  type CarAction,
  type CarState,
  type Gear,
  type Surface,
} from './carState';

const reduce = (...actions: CarAction[]) => actions.reduce(carReducer, initialCarState);
const reduceFrom = (state: CarState, ...actions: CarAction[]) => actions.reduce(carReducer, state);
const gear = (value: Gear): CarAction => ({ type: 'gear/select', gear: value });

const BLUETOOTH: Surface = { kind: 'app', app: 'bluetooth' };

describe('surface', () => {
  test('an app icon opens its app, and a second click closes it', () => {
    const open = reduce({ type: 'app/toggle', app: 'bluetooth' });
    expect(open.surface).toEqual(BLUETOOTH);
    expect(carReducer(open, { type: 'app/toggle', app: 'bluetooth' }).surface).toEqual({
      kind: 'closed',
    });
  });

  test('camera and settings icons open their own surfaces', () => {
    expect(reduce({ type: 'app/toggle', app: 'camera' }).surface).toEqual({ kind: 'camera' });
    expect(reduce({ type: 'app/toggle', app: 'car-settings' }).surface).toEqual({
      kind: 'settings',
      panel: 'Controls',
    });
  });

  test('the wifi shortcut opens Settings on Wifi, and Settings reopens on Controls', () => {
    const wifi = reduce({ type: 'settings/open', panel: 'Wifi' });
    expect(wifi.surface).toEqual({ kind: 'settings', panel: 'Wifi' });
    const closed = carReducer(wifi, { type: 'surface/close' });
    expect(carReducer(closed, { type: 'app/toggle', app: 'car-settings' }).surface).toEqual({
      kind: 'settings',
      panel: 'Controls',
    });
  });

  test('Wifi then camera leaves no trace of the Settings deep link', () => {
    const camera = reduce({ type: 'settings/open', panel: 'Wifi' }, { type: 'camera/toggle' });
    expect(camera.surface).toEqual({ kind: 'camera' });
  });

  test('Shift+C toggles the camera outside Reverse', () => {
    const open = reduce({ type: 'camera/toggle' });
    expect(open.surface).toEqual({ kind: 'camera' });
    expect(carReducer(open, { type: 'camera/toggle' }).surface).toEqual({ kind: 'closed' });
  });
});

describe('reverse', () => {
  const reverse = reduce(gear('R'));

  test('forces the camera open', () => {
    expect(isCameraForced(reverse)).toBe(true);
    expect(reverse.surface).toEqual({ kind: 'camera' });
  });

  test.each<[string, CarAction]>([
    ['Shift+C', { type: 'camera/toggle' }],
    ['another app', { type: 'app/toggle', app: 'bluetooth' }],
    ['the camera icon', { type: 'app/toggle', app: 'camera' }],
    ['closing', { type: 'surface/close' }],
    ['Settings', { type: 'settings/open', panel: 'Wifi' }],
    ['browser back', { type: 'surface/restore', surface: { kind: 'closed' } }],
    ['the shelf', { type: 'modal/toggle', modal: 'app-shelf' }],
  ])('%s cannot replace the camera', (_name, action) => {
    expect(carReducer(reverse, action).surface).toEqual({ kind: 'camera' });
    expect(carReducer(reverse, action).activeModal).toBe(null);
  });

  test('leaving Reverse returns to what was open before it', () => {
    const state = reduce({ type: 'app/toggle', app: 'bluetooth' }, gear('R'), gear('D'));
    expect(state.surface).toEqual(BLUETOOTH);
    expect(state.surfaceBeforeReverse).toBe(null);
  });

  test('entering Reverse closes any modal', () => {
    expect(reduce({ type: 'modal/toggle', modal: 'app-shelf' }, gear('R')).activeModal).toBe(null);
  });
});

describe('gears', () => {
  const GEARS: Gear[] = ['P', 'R', 'N', 'D'];
  const pairs = GEARS.flatMap((from) => GEARS.map((to) => [from, to] as const));

  test.each(pairs)('%s to %s keeps a non-parked-only app open', (from, to) => {
    const start = reduceFrom({ ...initialCarState, gear: from, surface: BLUETOOTH });
    const next = carReducer(start, gear(to));
    expect(next.gear).toBe(to);
    if (from === to) expect(next).toBe(start);
    if (to === 'R' && from !== 'R') expect(next.surface).toEqual({ kind: 'camera' });
    else if (to !== 'R') expect(next.surface.kind).not.toBe('camera');
  });

  test('re-selecting the current gear changes nothing', () => {
    const state = reduce({ type: 'app/toggle', app: 'bluetooth' });
    expect(carReducer(state, gear('P'))).toBe(state);
  });

  test('P to D keeps the open app', () => {
    const state = reduce({ type: 'app/toggle', app: 'bluetooth' }, gear('D'));
    expect(state.surface).toEqual(BLUETOOTH);
  });

  test('a parked-only app closes with a message on leaving Park', () => {
    const state = reduce({ type: 'app/toggle', app: 'arcade' }, gear('D'));
    expect(state.surface).toEqual({ kind: 'closed' });
    expect(state.notice?.message).toBe('Arcade is only available in Park');
  });

  test('a parked-only app is refused outside Park, with a reason', () => {
    const state = reduce(gear('D'), { type: 'app/toggle', app: 'arcade' });
    expect(state.surface).toEqual({ kind: 'closed' });
    expect(state.notice?.message).toBe('Arcade is only available in Park');
  });

  test('Reverse from a parked-only app returns to it only in Park', () => {
    const toPark = reduce({ type: 'app/toggle', app: 'arcade' }, gear('R'), gear('P'));
    expect(activeApp(toPark)).toBe('arcade');
    const toDrive = reduce({ type: 'app/toggle', app: 'arcade' }, gear('R'), gear('D'));
    expect(activeApp(toDrive)).toBe(null);
  });

  test('Park and Reverse are refused at speed, with a reason', () => {
    const moving = reduce(gear('D'), { type: 'speed/set', speed: 40 });
    expect(canShift(moving, 'P')).toEqual({
      allowed: false,
      reason: 'Slow down to shift into Park',
    });
    const refused = carReducer(moving, gear('R'));
    expect(refused.gear).toBe('D');
    expect(refused.notice?.message).toBe('Slow down to shift into Reverse');
    expect(carReducer(moving, gear('N')).gear).toBe('N');
  });
});

describe('closures and lock', () => {
  test('only one of frunk and trunk is open at a time', () => {
    const frunk: CarAction = { type: 'compartment/toggle', compartment: 'frunk' };
    const trunk: CarAction = { type: 'compartment/toggle', compartment: 'trunk' };
    expect(reduce(frunk).openCompartment).toBe('frunk');
    expect(reduce(frunk, trunk).openCompartment).toBe('trunk');
    expect(reduce(trunk, trunk).openCompartment).toBe(null);
  });

  test('closures close on leaving Park and cannot open outside it', () => {
    const frunk: CarAction = { type: 'compartment/toggle', compartment: 'frunk' };
    expect(reduce(frunk, gear('D')).openCompartment).toBe(null);
    const refused = reduce(gear('D'), frunk);
    expect(refused.openCompartment).toBe(null);
    expect(refused.notice?.message).toBe('Shift to Park to open the frunk');
  });

  test('the car locks on Drive and unlocks on Park, each behind a setting', () => {
    const unlocked = reduce({ type: 'lock/toggle' });
    expect(unlocked.isLocked).toBe(false);
    expect(carReducer(unlocked, gear('D')).isLocked).toBe(true);
    expect(reduce(gear('D'), gear('P')).isLocked).toBe(false);

    const manual = reduce(
      { type: 'settings/set', patch: { driveAwayLock: false, unlockOnPark: false } },
      { type: 'lock/toggle' },
    );
    expect(carReducer(manual, gear('D')).isLocked).toBe(false);
  });
});

describe('turn signals and hazards', () => {
  const left: CarAction = { type: 'signal/left' };
  const right: CarAction = { type: 'signal/right' };
  const hazards: CarAction = { type: 'signal/hazards' };

  test.each<[string, CarAction[], boolean, boolean]>([
    ['left', [left], true, false],
    ['left again cancels', [left, left], false, false],
    ['right replaces left', [left, right], false, true],
    ['hazards light both', [hazards], true, true],
    ['hazards off with no signal', [hazards, hazards], false, false],
    ['hazards off restores the signal', [left, hazards, hazards], true, false],
    ['a signal during hazards keeps them on', [hazards, left], true, true],
    ['a signal set during hazards shows after', [hazards, right, hazards], false, true],
  ])('%s', (_name, actions, isLeftLit, isRightLit) => {
    const state = reduce(...actions);
    expect(leftSignalLit(state)).toBe(isLeftLit);
    expect(rightSignalLit(state)).toBe(isRightLit);
  });
});

describe('modals', () => {
  test('the shelf has one source of truth, and every close path agrees', () => {
    const open = reduce({ type: 'modal/toggle', modal: 'app-shelf' });
    expect(open.activeModal).toBe('app-shelf');
    expect(carReducer(open, { type: 'modal/close' }).activeModal).toBe(null);
    expect(carReducer(open, { type: 'modal/toggle', modal: 'app-shelf' }).activeModal).toBe(null);
  });
});

describe('values stay in range', () => {
  test('temperature stays between 60 and 90', () => {
    expect(reduce({ type: 'temperature/step', delta: 100 }).temperature).toBe(90);
    expect(reduce({ type: 'temperature/step', delta: -100 }).temperature).toBe(60);
    expect(reduce({ type: 'temperature/step', delta: 1 }).temperature).toBe(71);
  });

  test('volume stays between 0 and 100', () => {
    expect(reduce({ type: 'volume/set', volume: 500 }).volume).toBe(100);
    expect(reduce({ type: 'volume/set', volume: -5 }).volume).toBe(0);
  });
});

describe('settings', () => {
  test('auto brightness leaves the manual value alone', () => {
    const state = reduce(
      { type: 'display/set', patch: { brightness: 40 } },
      { type: 'display/set', patch: { autoBrightness: true } },
      { type: 'display/set', patch: { autoBrightness: false } },
    );
    expect(state.display.brightness).toBe(40);
  });
});

describe('simulator', () => {
  const drive = (seconds: number, state: CarState) => {
    let next = state;
    for (let ticks = 0; ticks < seconds * 10; ticks += 1) {
      next = carReducer(next, { type: 'sim/tick', seconds: 0.1 });
    }
    return next;
  };
  const accelerating = reduce(gear('D'), { type: 'pedal/set', pedal: 'accelerate' });

  test('accelerating in Drive adds speed, distance and uses battery', () => {
    const state = drive(5, accelerating);
    expect(state.speed).toBeCloseTo(50, 0);
    expect(state.tripMiles).toBeGreaterThan(0);
    expect(state.odometerMiles).toBeGreaterThan(initialCarState.odometerMiles);
    expect(state.batteryPercent).toBeLessThan(initialCarState.batteryPercent);
  });

  test('the acceleration setting changes how fast the car gets there', () => {
    const chill = reduceFrom(accelerating, {
      type: 'settings/set',
      patch: { acceleration: 'chill' },
    });
    expect(drive(5, chill).speed).toBeLessThan(drive(5, accelerating).speed);
  });

  test('top speed depends on the gear', () => {
    expect(drive(30, accelerating).speed).toBe(90);
    const reverse = reduce(gear('R'), { type: 'pedal/set', pedal: 'accelerate' });
    expect(drive(30, reverse).speed).toBe(15);
  });

  test('the car does not move in Park or with an empty battery', () => {
    const parked = reduce({ type: 'pedal/set', pedal: 'accelerate' });
    expect(drive(5, parked).speed).toBe(0);
    expect(drive(5, { ...accelerating, batteryPercent: 0 }).speed).toBe(0);
  });

  test('braking stops the car, and lifting off slows it gently', () => {
    const moving = drive(5, accelerating);
    const braking = carReducer(moving, { type: 'pedal/set', pedal: 'brake' });
    expect(drive(5, braking).speed).toBe(0);
    const coasting = drive(1, carReducer(moving, { type: 'pedal/set', pedal: 'none' }));
    expect(coasting.speed).toBeGreaterThan(40);
    expect(coasting.speed).toBeLessThan(moving.speed);
  });

  test('charging stops at the limit, and blocks driving until unplugged', () => {
    const plugged = reduce({ type: 'charge/plug' });
    expect(plugged.chargeState).toBe('charging');
    expect(carReducer(plugged, gear('D')).gear).toBe('P');

    const done = drive(30, plugged);
    expect(done.batteryPercent).toBe(80);
    expect(done.chargeState).toBe('complete');
    expect(done.notice?.message).toBe('Charging complete');

    expect(reduceFrom(done, { type: 'charge/unplug' }, gear('D')).gear).toBe('D');
  });

  test('the car only charges in Park', () => {
    const state = reduce(gear('D'), { type: 'charge/plug' });
    expect(state.chargeState).toBe('unplugged');
    expect(state.notice?.message).toBe('Shift to Park to charge');
  });

  test('power follows the gear and the charge cable', () => {
    expect(vehiclePower(initialCarState)).toBe('parked');
    expect(vehiclePower(reduce(gear('D')))).toBe('driving');
    expect(vehiclePower(reduce({ type: 'charge/plug' }))).toBe('charging');
  });

  test('the simulation only runs while something is changing', () => {
    expect(isSimulationActive(initialCarState)).toBe(false);
    expect(isSimulationActive(accelerating)).toBe(true);
    expect(isSimulationActive(reduce({ type: 'charge/plug' }))).toBe(true);
  });
});

describe('notifications', () => {
  test('keeps a capped history, newest first, after the notice leaves the screen', () => {
    let state = initialCarState;
    for (let index = 0; index < 25; index += 1) {
      state = carReducer(state, { type: 'notice/show', message: `Message ${index}` });
    }
    state = carReducer(state, { type: 'notice/dismiss' });
    expect(state.notice).toBe(null);
    expect(state.notifications).toHaveLength(20);
    expect(state.notifications[0].message).toBe('Message 24');
    expect(carReducer(state, { type: 'notifications/clear' }).notifications).toEqual([]);
  });
});

// Random walks through every action. A fixed seed keeps failures reproducible.
describe('invariants', () => {
  const ACTIONS: CarAction[] = [
    gear('P'),
    gear('R'),
    gear('N'),
    gear('D'),
    { type: 'speed/set', speed: 0 },
    { type: 'speed/set', speed: 50 },
    { type: 'app/toggle', app: 'bluetooth' },
    { type: 'app/toggle', app: 'arcade' },
    { type: 'app/toggle', app: 'camera' },
    { type: 'app/toggle', app: 'car-settings' },
    { type: 'surface/close' },
    { type: 'surface/restore', surface: { kind: 'closed' } },
    { type: 'surface/restore', surface: { kind: 'app', app: 'arcade' } },
    { type: 'camera/toggle' },
    { type: 'settings/open', panel: 'Wifi' },
    { type: 'modal/toggle', modal: 'app-shelf' },
    { type: 'modal/close' },
    { type: 'compartment/toggle', compartment: 'frunk' },
    { type: 'compartment/toggle', compartment: 'trunk' },
    { type: 'signal/left' },
    { type: 'signal/hazards' },
  ];

  const random = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };

  test('hold through 200 random sequences', () => {
    const next = random(42);
    for (let run = 0; run < 200; run += 1) {
      let state = initialCarState;
      for (let step = 0; step < 100; step += 1) {
        state = carReducer(state, ACTIONS[Math.floor(next() * ACTIONS.length)]);

        if (state.gear === 'R') {
          expect(state.surface).toEqual({ kind: 'camera' });
          expect(state.activeModal).toBe(null);
        } else {
          expect(state.surfaceBeforeReverse).toBe(null);
        }
        if (state.gear !== 'P') {
          expect(state.openCompartment).toBe(null);
          expect(activeApp(state)).not.toBe('arcade');
        }
        expect(isPanelOpen(state)).toBe(activeApp(state) !== null);
      }
    }
  });
});
