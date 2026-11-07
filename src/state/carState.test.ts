import {
  activeApp,
  autopilotTargetSpeed,
  canAdjustSteering,
  canChangeSettings,
  canEngageAutopilot,
  canEnterMode,
  canSaveClip,
  canShift,
  canToggleChargePort,
  carReducer,
  chargeHoursRemaining,
  chargeKilowatts,
  dashcamState,
  initialCarState,
  isCameraForced,
  isHolding,
  isPanelOpen,
  isSimulationActive,
  leftSignalLit,
  rightSignalLit,
  sentryState,
  sessionKwh,
  sessionMiles,
  vehiclePower,
  type CarAction,
  type CarState,
  type Gear,
  type Surface,
  type VehicleSettings,
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
    const state = reduce({ type: 'app/toggle', app: 'theater' }, gear('D'));
    expect(state.surface).toEqual({ kind: 'closed' });
    expect(state.notice?.message).toBe('Theater is only available in Park');
  });

  test('Arcade waits, paused, instead of closing on leaving Park', () => {
    const state = reduce({ type: 'app/toggle', app: 'arcade' }, gear('D'));
    expect(activeApp(state)).toBe('arcade');
  });

  test('a parked-only app is refused outside Park, with a reason', () => {
    const state = reduce(gear('D'), { type: 'app/toggle', app: 'arcade' });
    expect(state.surface).toEqual({ kind: 'closed' });
    expect(state.notice?.message).toBe('Arcade is only available in Park');
  });

  test('Reverse from a parked-only app returns to it only in Park', () => {
    const toPark = reduce({ type: 'app/toggle', app: 'theater' }, gear('R'), gear('P'));
    expect(activeApp(toPark)).toBe('theater');
    const toDrive = reduce({ type: 'app/toggle', app: 'theater' }, gear('R'), gear('D'));
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

const withSettings = (patch: Partial<VehicleSettings>, state = initialCarState): CarState => ({
  ...state,
  settings: { ...state.settings, ...patch },
});
const inGear = (gearValue: Gear, state = initialCarState): CarState => ({
  ...state,
  gear: gearValue,
});
const tick = (seconds = 1): CarAction => ({ type: 'sim/tick', seconds });
const ticks = (count: number) => Array.from({ length: count }, () => tick());

describe('dynamics change how the car drives', () => {
  const coasting = (patch: Partial<VehicleSettings>, speed: number, batteryPercent = 50) =>
    reduceFrom({ ...withSettings(patch, inGear('D')), speed, batteryPercent }, tick()).speed;

  test.each([
    ['standard regen slows the car', {}, 50, 47],
    ['low regen slows it less', { regenBraking: 'low' }, 50, 48.5],
    ['Track Mode regen slows it more', { trackMode: true }, 50, 45],
    ['Roll fades regen out at low speed', { stoppingMode: 'roll' }, 5, 4],
    ['Roll still regens at speed', { stoppingMode: 'roll' }, 50, 47],
    ['Hold brakes to a stop', { stoppingMode: 'hold' }, 2, 0],
    ['Creep settles at walking pace', { stoppingMode: 'creep' }, 2, 3],
  ] as [string, Partial<VehicleSettings>, number, number][])('%s', (_, patch, from, to) => {
    expect(coasting(patch, from)).toBe(to);
  });

  test('a full pack limits regen unless the brakes make up for it', () => {
    expect(coasting({ brakeWhenRegenLimited: true }, 50, 98)).toBe(47);
    expect(coasting({ brakeWhenRegenLimited: false }, 50, 98)).toBe(49);
  });

  test.each([
    ['chill', 6],
    ['standard', 10],
    ['sport', 14],
  ] as const)('%s acceleration', (acceleration, speed) => {
    const state = withSettings({ acceleration }, inGear('D'));
    expect(reduceFrom({ ...state, pedal: 'accelerate' }, tick()).speed).toBe(speed);
  });

  test('Track Mode beats Sport, goes faster and uses more energy', () => {
    const track = withSettings({ trackMode: true }, inGear('D'));
    const pedal: CarState = { ...track, pedal: 'accelerate', speed: 100 };
    expect(reduceFrom({ ...track, pedal: 'accelerate' }, tick()).speed).toBe(16);
    expect(reduceFrom(pedal, tick()).speed).toBe(116);

    const used = (state: CarState) => 69 - reduceFrom(state, tick(60)).batteryPercent;
    const road: CarState = { ...inGear('D'), pedal: 'accelerate', speed: 60 };
    expect(used({ ...pedal, speed: 60 })).toBeGreaterThan(used(road));
  });

  test('regen gives energy back while the car slows', () => {
    const slowing: CarState = { ...inGear('D'), speed: 60 };
    expect(reduceFrom(slowing, tick()).batteryPercent).toBeGreaterThan(slowing.batteryPercent);
    const low = withSettings({ regenBraking: 'low' }, slowing);
    expect(reduceFrom(low, tick()).batteryPercent).toBeLessThan(
      reduceFrom(slowing, tick()).batteryPercent,
    );
  });

  test('Creep moves off by itself, and the loop runs for it', () => {
    const creep = withSettings({ stoppingMode: 'creep' }, inGear('D'));
    expect(isSimulationActive(creep)).toBe(true);
    expect(isSimulationActive(initialCarState)).toBe(false);
    expect(reduceFrom(creep, tick()).speed).toBeGreaterThan(0);
    expect(isSimulationActive({ ...creep, batteryPercent: 0 })).toBe(false);
  });

  test('Hold shows only while stopped in gear with no pedal down', () => {
    expect(isHolding(inGear('D'))).toBe(true);
    expect(isHolding(inGear('P'))).toBe(false);
    expect(isHolding({ ...inGear('D'), speed: 10 })).toBe(false);
    expect(isHolding(withSettings({ stoppingMode: 'roll' }, inGear('D')))).toBe(false);
  });
});

describe('permissions', () => {
  const drive = inGear('D');
  const plugged = reduce({ type: 'charge/plug' });

  test.each([
    ['Sentry in Park', canChangeSettings(initialCarState, { sentry: true }), true],
    ['Sentry in Drive', canChangeSettings(drive, { sentry: true }), false],
    ['turning Sentry off in Drive', canChangeSettings(drive, { sentry: false }), true],
    ['Track Mode in Park', canChangeSettings(initialCarState, { trackMode: true }), true],
    ['Track Mode in Drive', canChangeSettings(drive, { trackMode: true }), false],
    ['leaving Track Mode in Drive', canChangeSettings(drive, { trackMode: false }), true],
    ['removing the last key', canChangeSettings(initialCarState, { keys: [] }), false],
    ['any other setting in Drive', canChangeSettings(drive, { fogLights: true }), true],
    ['Car Wash in Park', canEnterMode(initialCarState, 'car-wash'), true],
    ['Car Wash in Drive', canEnterMode(drive, 'car-wash'), false],
    ['Car Wash while plugged in', canEnterMode(plugged, 'car-wash'), false],
    ['Screen Clean in Park', canEnterMode(initialCarState, 'screen-clean'), true],
    ['Screen Clean in Drive', canEnterMode(drive, 'screen-clean'), false],
    ['charge port in Park', canToggleChargePort(initialCarState), true],
    ['charge port in Drive', canToggleChargePort(drive), false],
    ['charge port with the cable in', canToggleChargePort(plugged), false],
    ['cruise in Drive', canEngageAutopilot(drive, 'cruise'), true],
    ['cruise in Park', canEngageAutopilot(initialCarState, 'cruise'), false],
    [
      'Autopilot in Track Mode',
      canEngageAutopilot(withSettings({ trackMode: true }, drive), 'cruise'),
      false,
    ],
    [
      'cruise with the feature off',
      canEngageAutopilot(withSettings({ trafficAwareCruise: false }, drive), 'cruise'),
      false,
    ],
    [
      'Autosteer with the feature off',
      canEngageAutopilot(withSettings({ autosteer: false }, drive), 'autosteer'),
      false,
    ],
    [
      'cruise with Autosteer off',
      canEngageAutopilot(withSettings({ autosteer: false }, drive), 'cruise'),
      true,
    ],
    ['steering wheel in Park', canAdjustSteering(initialCarState), true],
    ['steering wheel in Drive', canAdjustSteering(drive), false],
    ['saving a clip with the dashcam on', canSaveClip(withSettings({ dashcam: true })), true],
    ['saving a clip with the dashcam off', canSaveClip(initialCarState), false],
  ])('%s', (_, permission, allowed) => {
    expect(permission.allowed).toBe(allowed);
  });

  test.each([
    ['Sentry', { sentry: true }],
    ['Track Mode', { trackMode: true }],
  ] as [string, Partial<VehicleSettings>][])('%s is refused with a notice in Drive', (_, patch) => {
    const next = reduceFrom(drive, { type: 'settings/set', patch });
    expect(next.settings).toBe(drive.settings);
    expect(next.notice).not.toBe(null);
  });
});

describe('charging', () => {
  const plug: CarAction = { type: 'charge/plug' };

  test('current sets the speed, and the session records what was added', () => {
    const half = withSettings({ chargeCurrent: 24 });
    const next = reduceFrom(half, plug, tick(), tick());
    expect(next.batteryPercent).toBeCloseTo(70);
    expect(next.chargeSession?.percentAdded).toBeCloseTo(1);
    expect(sessionKwh(next.chargeSession!)).toBeCloseTo(0.75);
    expect(sessionMiles(next.chargeSession!)).toBeCloseTo(3.1);
    expect(next.chargeSession?.hours).toBeCloseTo(0.75 / chargeKilowatts(half));
  });

  test('time remaining follows the limit and the power', () => {
    expect(chargeHoursRemaining(initialCarState)).toBe(null);
    const plugged = reduce(plug);
    expect(chargeHoursRemaining(plugged)).toBeCloseTo((0.11 * 75) / 11.52);
    const half = reduceFrom(plugged, {
      type: 'settings/set',
      patch: { chargeCurrent: 24 },
    });
    expect(chargeHoursRemaining(half)).toBeCloseTo((0.11 * 75) / 5.76);
  });

  test('lowering the limit under the battery ends the session without taking charge away', () => {
    const next = reduceFrom(
      reduce(plug),
      { type: 'settings/set', patch: { chargeLimit: 50 } },
      tick(),
    );
    expect(next.batteryPercent).toBe(69);
    expect(next.chargeState).toBe('complete');
  });

  test('raising the limit on a finished session starts it again', () => {
    const done = reduceFrom(reduce(plug), ...ticks(12));
    expect(done.chargeState).toBe('complete');
    const next = reduceFrom(done, { type: 'settings/set', patch: { chargeLimit: 90 } });
    expect(next.chargeState).toBe('charging');
  });

  test('stopping and starting holds the battery, with the cable still in', () => {
    const stopped = reduceFrom(reduce(plug), { type: 'charge/toggle' });
    expect(stopped.chargeState).toBe('stopped');
    expect(reduceFrom(stopped, tick()).batteryPercent).toBe(69);
    expect(canShift(stopped, 'D').allowed).toBe(false);
    expect(reduceFrom(stopped, { type: 'charge/toggle' }).chargeState).toBe('charging');
  });

  describe('schedule', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const scheduled = () =>
      reduceFrom(withSettings({ scheduledCharging: true, scheduledChargeTime: '23:00' }), plug);

    test('waits for its time, and then charges', () => {
      vi.setSystemTime(new Date(2026, 0, 1, 22, 59));
      const waiting = scheduled();
      expect(waiting.chargeState).toBe('scheduled');
      expect(isSimulationActive(waiting)).toBe(true);
      expect(reduceFrom(waiting, tick())).toBe(waiting);

      vi.setSystemTime(new Date(2026, 0, 1, 23, 0));
      expect(reduceFrom(waiting, tick()).chargeState).toBe('charging');
    });

    test('Start Now does not wait', () => {
      vi.setSystemTime(new Date(2026, 0, 1, 12, 0));
      expect(reduceFrom(scheduled(), { type: 'charge/toggle' }).chargeState).toBe('charging');
    });
  });

  test('the port opens for the cable and closes behind it', () => {
    const open = reduce({ type: 'charge-port/toggle' });
    expect(open.chargePortOpen).toBe(true);
    expect(reduceFrom(open, { type: 'charge-port/toggle' }).chargePortOpen).toBe(false);

    const plugged = reduce(plug);
    expect(plugged.chargePortOpen).toBe(true);
    expect(reduceFrom(plugged, { type: 'charge-port/toggle' }).chargePortOpen).toBe(true);
    expect(reduceFrom(plugged, { type: 'charge/unplug' }).chargePortOpen).toBe(false);
  });
});

describe('autopilot', () => {
  const engage: CarAction = { type: 'autopilot/engage', mode: 'autosteer' };
  const drive = inGear('D');

  test('holds the speed limit plus the offset, then keeps it there', () => {
    const offset = withSettings({ speedOffset: 5 }, drive);
    expect(autopilotTargetSpeed(offset)).toBe(35);
    const engaged = reduceFrom({ ...offset, speed: 34 }, engage);
    expect(isSimulationActive(engaged)).toBe(true);
    expect(reduceFrom(engaged, ...ticks(3)).speed).toBe(35);
  });

  test.each([
    ['chill', 3],
    ['average', 5],
    ['assertive', 8],
  ] as const)('the %s profile sets how quickly it gets there', (drivingProfile, speed) => {
    const state = withSettings({ drivingProfile }, drive);
    expect(reduceFrom(state, engage, tick()).speed).toBe(speed);
  });

  test.each([
    ['the brake', { type: 'pedal/set', pedal: 'brake' }, 'off'],
    ['leaving Drive', gear('N'), 'off'],
    ['turning off cruise', { type: 'settings/set', patch: { trafficAwareCruise: false } }, 'off'],
    ['turning off Autosteer', { type: 'settings/set', patch: { autosteer: false } }, 'cruise'],
    ['the disengage action', { type: 'autopilot/disengage' }, 'off'],
  ] as [string, CarAction, string][])('%s ends it', (_, action, expected) => {
    expect(reduceFrom(drive, engage, action).autopilot).toBe(expected);
  });

  test('a refusal says why and leaves it off', () => {
    const next = reduce(engage);
    expect(next.autopilot).toBe('off');
    expect(next.notice?.message).toBe('Shift to Drive to engage');
  });
});

describe('sentry', () => {
  const armed = withSettings({ sentry: true });
  const alarm: CarAction = { type: 'sentry/alarm' };

  test.each([
    ['off', initialCarState, 'off'],
    ['standing by in Park', armed, 'standby'],
    ['sounding its alarm', reduceFrom(armed, alarm), 'alarm'],
    ['asleep in Drive with the setting kept', reduceFrom(armed, gear('D')), 'off'],
    ['back on guard in Park', reduceFrom(armed, gear('D'), gear('P')), 'standby'],
  ] as const)('%s', (_, state, expected) => {
    expect(sentryState(state)).toBe(expected);
  });

  test.each([
    ['unlocking the car', { ...armed, isLocked: true }, { type: 'lock/toggle' }],
    ['turning it off', armed, { type: 'settings/set', patch: { sentry: false } }],
    ['leaving Park', armed, gear('D')],
    ['dismissing it', armed, { type: 'sentry/clear' }],
  ] as [string, CarState, CarAction][])('%s stands the alarm down', (_, state, action) => {
    expect(reduceFrom(state, alarm, action).sentryAlarm).toBe(false);
  });

  test('there is no alarm with Sentry off', () => {
    expect(reduce(alarm).sentryAlarm).toBe(false);
  });

  test('an alarm saves a clip when the dashcam is on', () => {
    expect(reduceFrom(armed, alarm).dashcamClips).toEqual([]);
    const recording = withSettings({ dashcam: true }, armed);
    expect(reduceFrom(recording, alarm).dashcamClips[0]?.source).toBe('sentry');
  });
});

describe('dashcam', () => {
  const on = (patch: Partial<VehicleSettings>, state = initialCarState) =>
    withSettings({ dashcam: true, ...patch }, state);

  test.each([
    ['off', initialCarState, 'off'],
    ['Auto pauses in Park', on({ dashcamMode: 'auto' }), 'paused'],
    ['Auto records while driving', on({ dashcamMode: 'auto' }, inGear('D')), 'recording'],
    ['Auto records for Sentry', on({ dashcamMode: 'auto', sentry: true }), 'recording'],
    ['On Honk pauses in Park', on({ dashcamMode: 'honk' }), 'paused'],
    ['On Honk records while driving', on({ dashcamMode: 'honk' }, inGear('D')), 'recording'],
    ['Manual records in Park', on({ dashcamMode: 'manual' }), 'recording'],
  ] as const)('%s', (_, state, expected) => {
    expect(dashcamState(state)).toBe(expected);
  });

  test('saved clips are listed newest first, and capped', () => {
    const save: CarAction = { type: 'dashcam/save', source: 'honk' };
    const next = reduceFrom(on({}), ...Array.from({ length: 25 }, () => save));
    expect(next.dashcamClips).toHaveLength(20);
    expect(next.dashcamClips[0]).toMatchObject({ id: 25, source: 'honk' });
  });

  test('an off dashcam saves nothing', () => {
    const next = reduce({ type: 'dashcam/save', source: 'manual' });
    expect(next.dashcamClips).toEqual([]);
    expect(next.notice?.message).toBe('Turn on the dashcam first');
  });
});

describe('overlay modes', () => {
  const enter: CarAction = { type: 'mode/enter', mode: 'car-wash' };
  const exit: CarAction = { type: 'mode/exit' };
  const ready = {
    ...withSettings({ wipers: { mode: 'manual', speed: 2 }, sentry: true, windowsVented: true }),
    chargePortOpen: true,
  };

  test('Car Wash makes the car ready', () => {
    const next = reduceFrom(ready, enter);
    expect(next.overlayMode).toBe('car-wash');
    expect(next.settings).toMatchObject({
      wipers: { mode: 'off' },
      sentry: false,
      windowsVented: false,
    });
    expect(next.chargePortOpen).toBe(false);
  });

  test('leaving Car Wash puts back the wipers and Sentry, but not the windows', () => {
    const next = reduceFrom(ready, enter, exit);
    expect(next.overlayMode).toBe(null);
    expect(next.carWashRestore).toBe(null);
    expect(next.settings).toMatchObject({
      wipers: { mode: 'manual', speed: 2 },
      sentry: true,
      windowsVented: false,
    });
  });

  test('Free Roll is Neutral, and leaving the mode returns to Park', () => {
    const rolling = reduceFrom(ready, enter, gear('N'));
    expect(rolling.overlayMode).toBe('car-wash');
    expect(rolling.gear).toBe('N');
    expect(reduceFrom(rolling, gear('P')).overlayMode).toBe('car-wash');

    const next = reduceFrom(rolling, exit);
    expect(next.overlayMode).toBe(null);
    expect(next.gear).toBe('P');
  });

  test.each([
    ['Car Wash ends in Drive', 'car-wash', 'D', 'Car Wash Mode ended'],
    ['Car Wash ends in Reverse', 'car-wash', 'R', 'Car Wash Mode ended'],
    ['Screen Clean ends in Drive', 'screen-clean', 'D', 'Screen Clean Mode ended'],
    ['Screen Clean ends in Neutral', 'screen-clean', 'N', 'Screen Clean Mode ended'],
  ] as const)('%s', (_, mode, gearValue, message) => {
    const next = reduceFrom(ready, { type: 'mode/enter', mode }, gear(gearValue));
    expect(next.overlayMode).toBe(null);
    expect(next.notice?.message).toBe(message);
  });

  test('only one mode can be up at a time', () => {
    const next = reduceFrom(ready, enter, { type: 'mode/enter', mode: 'screen-clean' });
    expect(next.overlayMode).toBe('car-wash');
  });

  test('a refused entry changes nothing and says why', () => {
    const next = reduceFrom(inGear('D', ready), enter);
    expect(next.overlayMode).toBe(null);
    expect(next.settings).toBe(ready.settings);
    expect(next.notice?.message).toBe('Shift to Park to use Car Wash Mode');
  });
});

describe('locks and the glovebox', () => {
  const unlocked: CarState = { ...initialCarState, isLocked: false };
  const walkAway: CarAction = { type: 'lock/walk-away' };

  test.each([
    ['locks an unlocked car', unlocked, true],
    ['does nothing when turned off', withSettings({ walkAwayLock: false }, unlocked), false],
    ['does nothing away from Park', inGear('D', unlocked), false],
  ])('walking away %s', (_, state, locked) => {
    expect(reduceFrom(state, walkAway).isLocked).toBe(locked);
  });

  test.each([
    [true, true, true, false],
    [false, false, false, true],
  ])('drive-away %s and unlock-on-park %s', (driveAwayLock, unlockOnPark, onDrive, onPark) => {
    const state = withSettings({ driveAwayLock, unlockOnPark }, unlocked);
    expect(reduceFrom(state, gear('D')).isLocked).toBe(onDrive);
    const driving: CarState = { ...inGear('D', state), isLocked: true };
    expect(reduceFrom(driving, gear('P')).isLocked).toBe(onPark);
  });

  test('the glovebox opens and closes', () => {
    const open = reduce({ type: 'glovebox/toggle' });
    expect(open.gloveboxOpen).toBe(true);
    expect(reduceFrom(open, { type: 'glovebox/toggle' }).gloveboxOpen).toBe(false);
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
    { type: 'app/toggle', app: 'theater' },
    { type: 'app/toggle', app: 'camera' },
    { type: 'app/toggle', app: 'car-settings' },
    { type: 'surface/close' },
    { type: 'surface/restore', surface: { kind: 'closed' } },
    { type: 'surface/restore', surface: { kind: 'app', app: 'theater' } },
    { type: 'camera/toggle' },
    { type: 'settings/open', panel: 'Wifi' },
    { type: 'modal/toggle', modal: 'app-shelf' },
    { type: 'modal/close' },
    { type: 'compartment/toggle', compartment: 'frunk' },
    { type: 'compartment/toggle', compartment: 'trunk' },
    { type: 'signal/left' },
    { type: 'signal/hazards' },
    { type: 'mode/enter', mode: 'car-wash' },
    { type: 'mode/enter', mode: 'screen-clean' },
    { type: 'mode/exit' },
    { type: 'charge/plug' },
    { type: 'charge/unplug' },
    { type: 'autopilot/engage', mode: 'autosteer' },
    { type: 'pedal/set', pedal: 'brake' },
    { type: 'pedal/set', pedal: 'none' },
    { type: 'settings/set', patch: { sentry: true } },
    { type: 'sentry/alarm' },
    { type: 'sim/tick', seconds: 1 },
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
          expect(activeApp(state)).not.toBe('theater');
        }
        expect(isPanelOpen(state)).toBe(activeApp(state) !== null);
        if (state.gear !== 'D') expect(state.autopilot).toBe('off');
        if (state.gear !== 'P') {
          expect(state.overlayMode === null || state.gear === 'N').toBe(true);
          expect(state.sentryAlarm).toBe(false);
        }
        if (state.overlayMode !== 'car-wash') expect(state.carWashRestore).toBe(null);
        if (state.chargeState !== 'unplugged') expect(state.gear).toBe('P');
      }
    }
  });
});
