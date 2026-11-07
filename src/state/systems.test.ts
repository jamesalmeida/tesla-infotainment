import {
  canEnterValet,
  canInstallUpdate,
  canRestartDisplay,
  canSelectProfile,
  canSetPinToDrive,
  canSetSpeedLimit,
  canSetTowMode,
  canShift,
  canUseHomeLink,
  carReducer,
  connectedWifiName,
  effectiveCabin,
  hasUnreadNotifications,
  initialCarState,
  isHomeLinkInRange,
  isSimulationActive,
  isValet,
  bluetoothMediaSource,
  MAX_SPEED,
  MAX_TOASTS,
  MAX_TRIP_METERS,
  scheduleRunDate,
  speedCap,
  VALET_MAX_SPEED,
  wifiIndicator,
  type CarAction,
  type CarState,
  type Gear,
  type Permission,
  type ScheduleEntry,
} from './carState';
import { findProfile, VALET_PROFILE_ID } from './profiles';

const reduceFrom = (state: CarState, ...actions: CarAction[]) => actions.reduce(carReducer, state);
const reduce = (...actions: CarAction[]) => reduceFrom(initialCarState, ...actions);
const gear = (value: Gear): CarAction => ({ type: 'gear/select', gear: value });
const tick = (seconds: number): CarAction => ({ type: 'sim/tick', seconds });
const drive = reduce(gear('D'));

// Runs the loop the way useSimulation does, in short steps.
const run = (state: CarState, seconds: number) => {
  let next = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.5) next = carReducer(next, tick(0.5));
  return next;
};

const refusal = (permission: Permission) => (permission.allowed ? null : permission.reason);

describe('permissions', () => {
  const valet = reduce({ type: 'valet/enter', pin: '1234' });
  const farFromHome = { ...initialCarState, odometerMiles: initialCarState.odometerMiles + 5 };

  test.each<[string, Permission, string | null]>([
    ['Speed Limit Mode in Park', canSetSpeedLimit(initialCarState), null],
    [
      'Speed Limit Mode in Drive',
      canSetSpeedLimit(drive),
      'Shift to Park to change Speed Limit Mode',
    ],
    ['PIN to Drive in Drive', canSetPinToDrive(drive), 'Shift to Park to change PIN to Drive'],
    ['Tow Mode in Drive', canSetTowMode(drive), 'Shift to Park to change Tow Mode'],
    ['restart in Drive', canRestartDisplay(drive), 'Shift to Park to restart the touchscreen'],
    ['install in Drive', canInstallUpdate(drive), 'Shift to Park to install the update'],
    ['Valet in Park', canEnterValet(initialCarState), null],
    ['Valet in Drive', canEnterValet(drive), 'Shift to Park to use Valet Mode'],
    ['Valet twice', canEnterValet(valet), 'Valet Mode is already on'],
    ['a driver in Park', canSelectProfile(initialCarState, 2), null],
    ['a driver in Drive', canSelectProfile(drive, 2), 'Shift to Park to change drivers'],
    ['a driver in Valet', canSelectProfile(valet, 2), 'Exit Valet Mode to change drivers'],
    [
      'Valet as a driver',
      canSelectProfile(initialCarState, VALET_PROFILE_ID),
      'Enter a PIN to use Valet Mode',
    ],
    ['HomeLink at home', canUseHomeLink(initialCarState), null],
    ['HomeLink away', canUseHomeLink(farFromHome), 'Too far from home for HomeLink'],
    ['HomeLink in Valet', canUseHomeLink(valet), 'Not available in Valet Mode'],
  ])('%s', (_name, permission, reason) => {
    expect(refusal(permission)).toBe(reason);
  });
});

describe('toasts', () => {
  const show = (message: string): CarAction => ({ type: 'notice/show', message });

  test('stack newest first, up to the limit', () => {
    const state = reduce(show('A'), show('B'), show('C'), show('D'));
    expect(state.toasts.map((toast) => toast.message)).toEqual(['D', 'C', 'B']);
    expect(state.toasts).toHaveLength(MAX_TOASTS);
    expect(state.notifications).toHaveLength(4);
  });

  test('a repeated message moves up instead of stacking a copy', () => {
    const state = reduce(show('A'), show('B'), show('A'));
    expect(state.toasts.map((toast) => toast.message)).toEqual(['A', 'B']);
  });

  test('dismissing one leaves the others, and notice follows the newest left', () => {
    const shown = reduce(show('A'), show('B'));
    const state = carReducer(shown, { type: 'notice/dismiss', id: shown.toasts[0].id });
    expect(state.toasts.map((toast) => toast.message)).toEqual(['A']);
    expect(state.notice?.message).toBe('A');
    expect(carReducer(shown, { type: 'notice/dismiss' }).toasts).toEqual([]);
  });

  test('history stays unread until the panel has seen it, and clearing resets that', () => {
    const shown = reduce(show('A'));
    expect(hasUnreadNotifications(shown)).toBe(true);
    const seen = carReducer(shown, { type: 'notifications/seen' });
    expect(hasUnreadNotifications(seen)).toBe(false);
    const cleared = reduceFrom(seen, { type: 'notifications/clear' }, show('B'));
    expect(hasUnreadNotifications(cleared)).toBe(true);
  });
});

describe('trips', () => {
  const driven = run({ ...drive, speed: 60, pedal: 'accelerate' }, 60);

  test('driving moves every meter by the same distance', () => {
    const miles = driven.odometerMiles - initialCarState.odometerMiles;
    expect(driven.tripMiles).toBeCloseTo(miles);
    expect(driven.energyUsedKwh).toBeGreaterThan(initialCarState.energyUsedKwh);
  });

  test('resetting the current trip clears its distance and energy', () => {
    const reset = carReducer(driven, { type: 'trip/reset' });
    expect(reset.tripMiles).toBe(0);
    expect(reset.tripStartKwh).toBe(driven.energyUsedKwh);
  });

  test('a named meter starts from now and resets on its own', () => {
    const added = carReducer(driven, { type: 'trip/add', name: 'Holiday' });
    const meter = added.tripMeters.at(-1);
    expect(meter).toMatchObject({ name: 'Holiday', miles: driven.odometerMiles });
    const [first] = driven.tripMeters;
    const reset = carReducer(added, { type: 'trip/resetMeter', id: first.id });
    expect(reset.tripMeters[0].miles).toBe(driven.odometerMiles);
    expect(reset.tripMeters[1]).toEqual(added.tripMeters[1]);
  });

  test.each<[string, string, string]>([
    ['empty', '   ', 'Enter a name'],
    ['taken, in any case', 'trip a', 'trip a is already in use'],
  ])('a name that is %s is refused', (_name, name, reason) => {
    const state = reduce({ type: 'trip/add', name });
    expect(state.tripMeters).toEqual(initialCarState.tripMeters);
    expect(state.notice?.message).toBe(reason);
  });

  test('meters are capped', () => {
    let state = initialCarState;
    for (let index = 0; index < MAX_TRIP_METERS + 2; index += 1) {
      state = carReducer(state, { type: 'trip/add', name: `Meter ${index}` });
    }
    expect(state.tripMeters).toHaveLength(MAX_TRIP_METERS);
  });

  test('meters move, stop at the ends, rename and delete', () => {
    const [first, second] = initialCarState.tripMeters;
    const moved = reduce({ type: 'trip/move', id: second.id, offset: -1 });
    expect(moved.tripMeters.map(({ id }) => id)).toEqual([second.id, first.id]);
    const stuck = reduce({ type: 'trip/move', id: first.id, offset: -1 });
    expect(stuck.tripMeters).toBe(initialCarState.tripMeters);
    const renamed = reduce({ type: 'trip/rename', id: first.id, name: 'Commute' });
    expect(renamed.tripMeters[0].name).toBe('Commute');
    expect(reduce({ type: 'trip/remove', id: first.id }).tripMeters).toEqual([second]);
  });

  test('Since Last Charge restarts only when charge actually went in', () => {
    const stopped = { ...driven, speed: 0, pedal: 'none' as const };
    const pulled = reduceFrom(
      stopped,
      gear('P'),
      { type: 'charge/plug' },
      { type: 'charge/unplug' },
    );
    expect(pulled.sinceChargeBaseline).toBe(driven.sinceChargeBaseline);

    const charged = reduceFrom(stopped, gear('P'), { type: 'charge/plug' }, tick(1));
    expect(charged.sinceChargeBaseline.miles).toBe(driven.odometerMiles);
  });
});

describe('Speed Limit Mode', () => {
  const limited = reduce(
    { type: 'settings/set', patch: { speedLimitMph: 50 } },
    { type: 'speedLimit/enable', pin: '1234' },
  );

  test('caps the speed in Drive', () => {
    expect(speedCap(initialCarState)).toBe(MAX_SPEED);
    expect(speedCap(limited)).toBe(50);
    const flatOut = run(
      reduceFrom(limited, gear('D'), { type: 'pedal/set', pedal: 'accelerate' }),
      20,
    );
    expect(flatOut.speed).toBe(50);
  });

  test.each<[string, CarState, string, string]>([
    ['a bad PIN', initialCarState, '12', 'Choose a 4-digit PIN'],
    ['a moving car', drive, '1234', 'Shift to Park to change Speed Limit Mode'],
  ])('refuses %s', (_name, state, pin, reason) => {
    const refused = carReducer(state, { type: 'speedLimit/enable', pin });
    expect(refused.settings.speedLimitMode).toBe(false);
    expect(refused.notice?.message).toBe(reason);
  });

  test('turns off with the same PIN only', () => {
    const wrong = carReducer(limited, { type: 'speedLimit/disable', pin: '9999' });
    expect(wrong.settings.speedLimitMode).toBe(true);
    expect(wrong.notice?.message).toBe('Incorrect PIN');
    const right = carReducer(limited, { type: 'speedLimit/disable', pin: '1234' });
    expect(right.settings.speedLimitMode).toBe(false);
  });
});

describe('PIN to Drive', () => {
  const guarded = reduce({ type: 'pinToDrive/enable', pin: '4321' });

  test('stops the car leaving Park, and asks for the PIN', () => {
    expect(refusal(canShift(guarded, 'D'))).toBe('Enter your PIN to drive');
    const refused = carReducer(guarded, gear('D'));
    expect(refused.gear).toBe('P');
    expect(refused.activeModal).toBe('drive-pin');
  });

  test('the right PIN lets it go, and a wrong one does not', () => {
    const wrong = carReducer(guarded, { type: 'pinToDrive/unlock', pin: '0000' });
    expect(wrong.driveUnlocked).toBe(false);
    expect(wrong.notice?.message).toBe('Incorrect PIN');

    const unlocked = reduceFrom(
      guarded,
      gear('D'),
      { type: 'pinToDrive/unlock', pin: '4321' },
      gear('D'),
    );
    expect(unlocked.gear).toBe('D');
    expect(unlocked.activeModal).toBe(null);
  });

  test('locking the car asks again', () => {
    const unlocked = { ...carReducer(guarded, { type: 'pinToDrive/unlock', pin: '4321' }) };
    const unlockedDoors = { ...unlocked, isLocked: false };
    expect(carReducer(unlockedDoors, { type: 'lock/toggle' }).driveUnlocked).toBe(false);
  });

  test('a charge cable refuses first, without asking for a PIN', () => {
    const plugged = carReducer(guarded, { type: 'charge/plug' });
    expect(carReducer(plugged, gear('D')).activeModal).toBe(null);
  });

  test('clearing PINs lets a stuck driver out of everything', () => {
    const stuck = reduceFrom(
      guarded,
      { type: 'speedLimit/enable', pin: '1234' },
      { type: 'valet/enter', pin: '5555' },
      gear('D'),
    );
    const cleared = carReducer(stuck, { type: 'pins/reset' });
    expect(cleared.settings.pinToDrive).toBe(false);
    expect(cleared.settings.speedLimitMode).toBe(false);
    expect(isValet(cleared)).toBe(false);
    expect(cleared.activeModal).toBe(null);
    expect(carReducer(cleared, gear('D')).gear).toBe('D');
  });
});

describe('Require Safety Features', () => {
  const off = reduce({
    type: 'settings/set',
    patch: { blindSpotWarning: false, emergencyBraking: false, collisionWarning: 'off' },
  });

  test('turns the warnings back on, and keeps them on', () => {
    const required = carReducer(off, { type: 'safety/require', enabled: true });
    expect(required.settings).toMatchObject({
      blindSpotWarning: true,
      emergencyBraking: true,
      collisionWarning: 'average',
    });
    const tried = carReducer(required, {
      type: 'settings/set',
      patch: { blindSpotWarning: false, collisionWarning: 'off' },
    });
    expect(tried.settings.blindSpotWarning).toBe(true);
    expect(tried.settings.collisionWarning).toBe('average');
  });

  test('only changes in Park', () => {
    const refused = carReducer(drive, { type: 'safety/require', enabled: true });
    expect(refused.settings.requireSafetyFeatures).toBe(false);
  });
});

describe('profiles', () => {
  const active = (state: CarState) => findProfile(state.profiles, state.activeProfileId);

  test('each driver keeps their own positions and preferences', () => {
    const state = reduce(
      { type: 'cabin/set', patch: { seatPosition: 10 } },
      { type: 'volume/set', volume: 20 },
      { type: 'settings/set', patch: { mapUnits: 'km', acceleration: 'sport' } },
      { type: 'profile/select', id: 2 },
      { type: 'cabin/set', patch: { seatPosition: 90 } },
      { type: 'volume/set', volume: 80 },
      { type: 'settings/set', patch: { mapUnits: 'mi' } },
      { type: 'profile/select', id: 1 },
    );
    expect(state.cabin.seatPosition).toBe(10);
    expect(state.volume).toBe(20);
    expect(state.settings.mapUnits).toBe('km');

    const back = carReducer(state, { type: 'profile/select', id: 2 });
    expect(back.cabin.seatPosition).toBe(90);
    expect(back.volume).toBe(80);
    expect(back.settings.mapUnits).toBe('mi');
  });

  test('settings that belong to the car stay put', () => {
    const state = reduce(
      { type: 'settings/set', patch: { sentry: true } },
      { type: 'profile/select', id: 2 },
      { type: 'settings/set', patch: { sentry: false } },
      { type: 'profile/select', id: 1 },
    );
    expect(state.settings.sentry).toBe(false);
  });

  test('adding a driver starts them from the current car, ahead of Valet', () => {
    const state = reduce(
      { type: 'cabin/set', patch: { mirrorTilt: 12 } },
      { type: 'profile/add', name: ' Robin ' },
    );
    expect(active(state).name).toBe('Robin');
    expect(state.cabin.mirrorTilt).toBe(12);
    expect(state.profiles.at(-1)?.id).toBe(VALET_PROFILE_ID);
    expect(state.profiles.map(({ id }) => id)).toEqual([1, 2, 3, 5, VALET_PROFILE_ID]);
  });

  test.each<[string, CarAction, string]>([
    ['a blank name', { type: 'profile/add', name: ' ' }, 'Enter a name'],
    ['a name in use', { type: 'profile/add', name: 'sam' }, 'sam is already in use'],
    [
      'renaming to a name in use',
      { type: 'profile/rename', id: 1, name: 'Sam' },
      'Sam is already in use',
    ],
  ])('refuses %s', (_name, action, reason) => {
    const state = reduce(action);
    expect(state.profiles).toBe(initialCarState.profiles);
    expect(state.notice?.message).toBe(reason);
  });

  test('a driver can be renamed, and Valet cannot', () => {
    expect(reduce({ type: 'profile/rename', id: 2, name: 'Sasha' }).profiles[1].name).toBe('Sasha');
    expect(reduce({ type: 'profile/rename', id: VALET_PROFILE_ID, name: 'Mine' }).profiles).toBe(
      initialCarState.profiles,
    );
  });

  test('deleting the current driver hands over to the first one left', () => {
    const state = reduce({ type: 'profile/delete', id: 1 });
    expect(state.activeProfileId).toBe(2);
    expect(state.profiles.some(({ id }) => id === 1)).toBe(false);
  });

  test('the last driver and Valet cannot be deleted', () => {
    const state = reduce(
      { type: 'profile/delete', id: 2 },
      { type: 'profile/delete', id: 3 },
      { type: 'profile/delete', id: 1 },
      { type: 'profile/delete', id: VALET_PROFILE_ID },
    );
    expect(state.profiles.map(({ id }) => id)).toEqual([1, VALET_PROFILE_ID]);
  });

  test('Easy Entry moves on Park, returns on leaving it, and never changes the saved seat', () => {
    const on = reduce(
      { type: 'settings/set', patch: { easyEntry: true } },
      { type: 'cabin/set', patch: { seatPosition: 30 } },
    );
    const parked = reduceFrom(on, gear('D'), gear('P'));
    expect(parked.easyEntryActive).toBe(true);
    expect(effectiveCabin(parked).seatPosition).toBe(100);
    expect(parked.cabin.seatPosition).toBe(30);

    const away = carReducer(parked, gear('D'));
    expect(effectiveCabin(away).seatPosition).toBe(30);
  });
});

test('turning Easy Entry off puts the seat back straight away', () => {
  const parked = reduce(
    { type: 'settings/set', patch: { easyEntry: true } },
    gear('D'),
    gear('P'),
    { type: 'settings/set', patch: { easyEntry: false } },
  );
  expect(parked.easyEntryActive).toBe(false);
});

describe('Valet Mode', () => {
  const valet = reduce({ type: 'valet/enter', pin: '1234' });

  test('takes over the profile, caps the speed and slows acceleration', () => {
    expect(isValet(valet)).toBe(true);
    expect(valet.activeProfileId).toBe(VALET_PROFILE_ID);
    expect(speedCap(valet)).toBe(VALET_MAX_SPEED);

    const pressed = reduceFrom(valet, gear('D'), { type: 'pedal/set', pedal: 'accelerate' });
    expect(run(pressed, 1).speed).toBeCloseTo(6);
    expect(run(pressed, 30).speed).toBe(VALET_MAX_SPEED);
  });

  test.each<[string, CarState, string, string]>([
    ['outside Park', drive, '1234', 'Shift to Park to use Valet Mode'],
    ['without a full PIN', initialCarState, '12', 'Choose a 4-digit PIN'],
  ])('cannot start %s', (_name, state, pin, reason) => {
    const refused = carReducer(state, { type: 'valet/enter', pin });
    expect(isValet(refused)).toBe(false);
    expect(refused.notice?.message).toBe(reason);
  });

  test.each<[string, CarAction]>([
    ['add', { type: 'profile/add', name: 'Nosy' }],
    ['rename', { type: 'profile/rename', id: 1, name: 'Nosy' }],
    ['delete', { type: 'profile/delete', id: 1 }],
    ['select', { type: 'profile/select', id: 2 }],
  ])('drivers cannot be changed: %s', (_name, action) => {
    const refused = carReducer(valet, action);
    expect(refused.activeProfileId).toBe(VALET_PROFILE_ID);
    expect(refused.profiles).toBe(valet.profiles);
  });

  test('ends with the right PIN, in Park, back on the same driver', () => {
    const start = reduce(
      { type: 'profile/select', id: 2 },
      { type: 'cabin/set', patch: { seatPosition: 22 } },
      { type: 'valet/enter', pin: '1234' },
    );
    expect(carReducer(start, { type: 'valet/exit', pin: '0000' }).valet).not.toBe(null);
    const moving = carReducer(start, gear('D'));
    expect(carReducer(moving, { type: 'valet/exit', pin: '1234' }).valet).not.toBe(null);

    const done = carReducer(start, { type: 'valet/exit', pin: '1234' });
    expect(done.valet).toBe(null);
    expect(done.activeProfileId).toBe(2);
    expect(done.cabin.seatPosition).toBe(22);
  });

  test('a return driver who no longer exists hands over to the first driver', () => {
    const orphaned = { ...valet, valet: { pin: '1234', returnProfileId: 99 } };
    expect(carReducer(orphaned, { type: 'valet/exit', pin: '1234' }).activeProfileId).toBe(1);
  });

  test('radios and garage stay out of reach', () => {
    expect(carReducer(valet, { type: 'wifi/connect', id: 'cafe', password: '' }).wifi.attempt).toBe(
      null,
    );
    expect(carReducer(valet, { type: 'bluetooth/pair', id: 'phone' }).bluetooth.pairing).toBe(null);
    expect(carReducer(valet, { type: 'homelink/toggle' }).homelink.door).toBe('closed');
  });
});

describe('wifi', () => {
  const connect = (id: string, password = ''): CarAction => ({
    type: 'wifi/connect',
    id,
    password,
  });

  test.each<[string, CarAction, string | null, string | null]>([
    ['the right password', connect('home', 'demo1234'), 'home', null],
    ['an open network', connect('cafe'), 'cafe', null],
    ['the wrong password', connect('home', 'nope'), null, 'Incorrect password'],
    [
      'a network that always fails',
      connect('neighbour', 'faraway1'),
      null,
      'The signal is too weak to connect',
    ],
  ])('%s', (_name, action, connectedId, error) => {
    const connecting = reduce(action);
    expect(wifiIndicator(connecting)).toBe('connecting');
    expect(isSimulationActive(connecting)).toBe(true);

    const done = run(connecting, 3);
    expect(done.wifi.connectedId).toBe(connectedId);
    expect(done.wifi.error?.message ?? null).toBe(error);
    expect(isSimulationActive(done)).toBe(false);
  });

  test('a saved network joins again without the password', () => {
    const joined = run(reduce(connect('home', 'demo1234')), 3);
    expect(connectedWifiName(joined)).toBe('Demo Home');
    const again = run(reduceFrom(joined, { type: 'wifi/disconnect' }, connect('home')), 3);
    expect(again.wifi.connectedId).toBe('home');
  });

  test('forgetting a network drops it, and it asks for the password again', () => {
    const joined = run(reduce(connect('home', 'demo1234')), 3);
    const forgotten = carReducer(joined, { type: 'wifi/forget', id: 'home' });
    expect(forgotten.wifi.connectedId).toBe(null);
    expect(forgotten.wifi.savedIds).toEqual([]);
    expect(run(carReducer(forgotten, connect('home')), 3).wifi.error?.message).toBe(
      'Incorrect password',
    );
  });

  test('turning Wifi off disconnects, and on again rejoins the last network', () => {
    const joined = run(reduce(connect('home', 'demo1234')), 3);
    const off = carReducer(joined, { type: 'wifi/enable', enabled: false });
    expect(wifiIndicator(off)).toBe('off');
    expect(off.wifi.connectedId).toBe(null);
    const on = run(carReducer(off, { type: 'wifi/enable', enabled: true }), 3);
    expect(wifiIndicator(on)).toBe('connected');
  });

  test('cannot connect while Wifi is off', () => {
    const state = reduce({ type: 'wifi/enable', enabled: false }, connect('cafe'));
    expect(state.wifi.attempt).toBe(null);
    expect(state.notice?.message).toBe('Turn on Wifi first');
  });
});

describe('bluetooth', () => {
  const pair = (id: string): CarAction[] => [
    { type: 'bluetooth/pair', id },
    { type: 'bluetooth/confirm' },
  ];
  const paired = run(reduce(...pair('phone')), 3);

  test('pairing waits for the code, then connects and becomes the priority', () => {
    const asking = reduce({ type: 'bluetooth/pair', id: 'phone' });
    expect(asking.bluetooth.pairing).toEqual({ deviceId: 'phone', phase: 'confirm' });
    expect(isSimulationActive(asking)).toBe(false);

    expect(paired.bluetooth).toMatchObject({
      pairedIds: ['phone'],
      connectedId: 'phone',
      priorityId: 'phone',
      pairing: null,
    });
  });

  test('cancelling leaves nothing paired', () => {
    const state = reduce({ type: 'bluetooth/pair', id: 'phone' }, { type: 'bluetooth/cancel' });
    expect(state.bluetooth.pairing).toBe(null);
    expect(state.bluetooth.pairedIds).toEqual([]);
  });

  test('a device that fails shows why', () => {
    const state = run(reduce(...pair('headphones')), 3);
    expect(state.bluetooth.pairedIds).toEqual([]);
    expect(state.bluetooth.error).toEqual({
      deviceId: 'headphones',
      message: 'The device stopped responding',
    });
  });

  test('the player follows the connected device, if it can play audio', () => {
    expect(bluetoothMediaSource(initialCarState)).toBe(null);
    expect(bluetoothMediaSource(paired)).toBe('Demo Phone');
    const workPhone = run(reduceFrom(paired, ...pair('work-phone')), 3);
    expect(bluetoothMediaSource(workPhone)).toBe(null);
  });

  test('the priority device connects when Bluetooth comes on, and takes over on forget', () => {
    const two = run(reduceFrom(paired, ...pair('tablet')), 3);
    expect(two.bluetooth.connectedId).toBe('tablet');
    const restarted = reduceFrom(
      two,
      { type: 'bluetooth/enable', enabled: false },
      { type: 'bluetooth/enable', enabled: true },
    );
    expect(restarted.bluetooth.connectedId).toBe('phone');

    const forgot = carReducer(two, { type: 'bluetooth/forget', id: 'tablet' });
    expect(forgot.bluetooth.connectedId).toBe('phone');
    const lostPriority = carReducer(two, { type: 'bluetooth/forget', id: 'phone' });
    expect(lostPriority.bluetooth.priorityId).toBe('tablet');
  });
});

describe('schedule', () => {
  const entry = (patch: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
    id: 1,
    kind: 'charge',
    time: '07:30',
    days: [],
    enabled: true,
    lastRanOn: null,
    ...patch,
  });
  // A Monday.
  const monday = new Date(2026, 10, 2, 7, 30);

  test.each<[string, ScheduleEntry, Date, string | null]>([
    ['a one-off at its time', entry(), monday, '2026-11-02'],
    ['the wrong minute', entry(), new Date(2026, 10, 2, 7, 31), null],
    ['switched off', entry({ enabled: false }), monday, null],
    ['a matching day', entry({ days: [1] }), monday, '2026-11-02'],
    ['another day', entry({ days: [2, 3] }), monday, null],
    ['already run today', entry({ days: [1], lastRanOn: '2026-11-02' }), monday, null],
  ])('%s', (_name, item, now, expected) => {
    expect(scheduleRunDate(item, now)).toBe(expected);
  });

  const add = (kind: 'charge' | 'departure', days: number[] = []): CarAction => ({
    type: 'schedule/add',
    kind,
    time: '07:30',
    days,
  });

  test('a bad time is refused', () => {
    const state = reduce({ type: 'schedule/add', kind: 'charge', time: '25:00', days: [] });
    expect(state.schedule).toEqual([]);
  });

  test('a one-off switches itself off after running, and a recurring entry does not', () => {
    const once = reduce(add('departure'), { type: 'schedule/run', id: 1, date: '2026-11-02' });
    expect(once.schedule[0]).toMatchObject({ enabled: false, lastRanOn: '2026-11-02' });
    expect(once.notice?.message).toBe('Getting ready for your 07:30 departure');

    const weekly = reduce(add('departure', [1]), {
      type: 'schedule/run',
      id: 1,
      date: '2026-11-02',
    });
    expect(weekly.schedule[0].enabled).toBe(true);
  });

  test('a charge schedule holds a plugged-in car until its time', () => {
    const held = reduce(add('charge'), { type: 'charge/plug' });
    expect(held.chargeHeld).toBe(true);
    expect(isSimulationActive(held)).toBe(false);
    expect(carReducer(held, tick(5)).batteryPercent).toBe(held.batteryPercent);

    const running = carReducer(held, { type: 'schedule/run', id: 1, date: '2026-11-02' });
    expect(running.chargeHeld).toBe(false);
    expect(running.notice?.message).toBe('Scheduled charging started');
    expect(carReducer(running, tick(5)).batteryPercent).toBeGreaterThan(held.batteryPercent);
  });

  test('Start Now and unplugging both clear the hold', () => {
    const held = reduce(add('charge'), { type: 'charge/plug' });
    expect(carReducer(held, { type: 'charge/startNow' }).chargeHeld).toBe(false);
    expect(carReducer(held, { type: 'charge/unplug' }).chargeHeld).toBe(false);
  });

  test('an unplugged car says so when its charge time comes', () => {
    const state = reduce(add('charge'), { type: 'schedule/run', id: 1, date: '2026-11-02' });
    expect(state.notice?.message).toBe('Plug in to start scheduled charging');
  });

  test('entries can be switched off and removed', () => {
    const off = reduce(add('charge'), { type: 'schedule/enable', id: 1, enabled: false });
    expect(carReducer(off, { type: 'charge/plug' }).chargeHeld).toBe(false);
    expect(carReducer(off, { type: 'schedule/remove', id: 1 }).schedule).toEqual([]);
  });
});

describe('HomeLink', () => {
  test('opens and closes over time, and can turn back halfway', () => {
    const opening = reduce({ type: 'homelink/toggle' });
    expect(opening.homelink.door).toBe('opening');
    expect(isSimulationActive(opening)).toBe(true);

    const halfway = run(opening, 2);
    expect(halfway.homelink.doorPosition).toBeCloseTo(0.5);
    const open = run(opening, 4);
    expect(open.homelink).toMatchObject({ door: 'open', doorPosition: 1 });
    expect(isSimulationActive(open)).toBe(false);

    const reversed = carReducer(halfway, { type: 'homelink/toggle' });
    expect(reversed.homelink.door).toBe('closing');
    expect(run(reversed, 2).homelink).toMatchObject({ door: 'closed', doorPosition: 0 });
  });

  test('driving away leaves range, and setting home brings it back', () => {
    const away = { ...initialCarState, odometerMiles: initialCarState.odometerMiles + 1 };
    expect(isHomeLinkInRange(away)).toBe(false);
    expect(carReducer(away, { type: 'homelink/toggle' }).homelink.door).toBe('closed');
    expect(isHomeLinkInRange(carReducer(away, { type: 'homelink/setHome' }))).toBe(true);
  });
});

describe('software update', () => {
  const ready = run(
    carReducer(run(reduce({ type: 'software/check' }), 3), { type: 'software/download' }),
    7,
  );

  test('runs from check to ready', () => {
    const checked = run(reduce({ type: 'software/check' }), 3);
    expect(checked.softwareUpdate).toEqual({ phase: 'available', version: '2026.44.1-demo' });
    expect(ready.softwareUpdate).toEqual({ phase: 'ready', version: '2026.44.1-demo' });
  });

  test('the preference decides which update is on offer', () => {
    const advanced = run(
      reduce(
        { type: 'settings/set', patch: { updatePreference: 'advanced' } },
        { type: 'software/check' },
      ),
      3,
    );
    expect(advanced.softwareUpdate).toEqual({ phase: 'available', version: '2026.46.0-demo' });
  });

  test('only installs in Park, and holds the car there until done', () => {
    const moving = carReducer(ready, gear('D'));
    const refused = carReducer(moving, { type: 'software/install' });
    expect(refused.softwareUpdate.phase).toBe('ready');
    expect(refused.notice?.message).toBe('Shift to Park to install the update');

    const installing = carReducer(ready, { type: 'software/install' });
    expect(carReducer(installing, gear('D')).gear).toBe('P');
  });

  test('finishing records the version, restarts, and leaves nothing to install', () => {
    const done = run(carReducer(ready, { type: 'software/install' }), 6);
    expect(done.softwareUpdate.phase).toBe('idle');
    expect(done.installedUpdate).toBe('2026.44.1-demo');
    expect(done.restartSecondsLeft).toBeGreaterThan(0);

    const rechecked = run(carReducer(done, { type: 'software/check' }), 3);
    expect(rechecked.softwareUpdate.phase).toBe('idle');
    expect(rechecked.notifications[0].message).toBe('Software is up to date');
  });
});

describe('service', () => {
  test('a restart clears the screen and counts itself down', () => {
    const restarting = reduce({ type: 'app/toggle', app: 'bluetooth' }, { type: 'system/restart' });
    expect(restarting.surface).toEqual({ kind: 'closed' });
    expect(restarting.restartSecondsLeft).toBeGreaterThan(0);
    expect(isSimulationActive(restarting)).toBe(true);
    expect(run(restarting, 4).restartSecondsLeft).toBe(0);
  });

  test('a restart needs Park', () => {
    expect(carReducer(drive, { type: 'system/restart' }).restartSecondsLeft).toBe(0);
  });

  test('Tow Mode needs Park, and then blocks Drive and Reverse but not Neutral', () => {
    expect(carReducer(drive, { type: 'tow/set', enabled: true }).settings.towMode).toBe(false);
    const towing = reduce({ type: 'tow/set', enabled: true });
    expect(carReducer(towing, gear('D')).gear).toBe('P');
    expect(carReducer(towing, gear('R')).gear).toBe('P');
    expect(carReducer(towing, gear('N')).gear).toBe('N');
  });
});

test('nothing here wakes the loop while the car is idle', () => {
  expect(isSimulationActive(initialCarState)).toBe(false);
});
