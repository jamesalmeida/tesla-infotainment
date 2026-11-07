import { DOCK } from '../apps/registry';
import { carReducer, initialCarState, type CarAction } from './carState';
import { initialClimate } from './climate';
import { restoreState, serializeState } from './persistence';

const saved = (state: unknown, version = 1) => JSON.stringify({ version, state });

test('restores saved preferences', () => {
  const restored = restoreState(
    initialCarState,
    saved({
      climate: { driverTemp: 72 },
      volume: 30,
      activeProfileId: 2,
      settings: { ...initialCarState.settings, sentry: true, wipers: { mode: 'manual', speed: 2 } },
      display: { brightness: 40, autoBrightness: false },
    }),
  );

  expect(restored.climate.driverTemp).toBe(72);
  expect(restored.climate.passengerTemp).toBe(72);
  expect(restored.volume).toBe(30);
  expect(restored.activeProfileId).toBe(2);
  expect(restored.settings.sentry).toBe(true);
  expect(restored.settings.wipers).toEqual({ mode: 'manual', speed: 2 });
  expect(restored.display.brightness).toBe(40);
});

test('always starts in Park with nothing open', () => {
  const restored = restoreState(
    initialCarState,
    saved({ gear: 'D', surface: { kind: 'camera' }, volume: 30 }),
  );

  expect(restored.gear).toBe('P');
  expect(restored.surface).toEqual({ kind: 'closed' });
});

test.each([
  ['nothing saved', null],
  ['invalid JSON', '{nope'],
  ['a different shape', '[1,2,3]'],
  ['an older schema', saved({ volume: 30 }, 0)],
])('%s falls back to the defaults', (_name, raw) => {
  expect(restoreState(initialCarState, raw)).toBe(initialCarState);
});

test('invalid values are dropped one at a time', () => {
  const restored = restoreState(
    initialCarState,
    saved({
      climate: { driverTemp: 900 },
      volume: 'loud',
      settings: { sentry: 'yes', dashcam: true, wipers: { mode: 'manual', speed: 9 } },
      display: { brightness: -4 },
    }),
  );

  expect(restored.climate.driverTemp).toBe(initialClimate.driverTemp);
  expect(restored.volume).toBe(initialCarState.volume);
  expect(restored.settings.sentry).toBe(false);
  expect(restored.settings.dashcam).toBe(true);
  expect(restored.settings.wipers).toEqual(initialCarState.settings.wipers);
  expect(restored.display.brightness).toBe(initialCarState.display.brightness);
});

describe('settings added by the panels', () => {
  const restoreSettings = (settings: unknown) =>
    restoreState(initialCarState, saved({ settings })).settings;
  const defaults = initialCarState.settings;

  test('valid values come back', () => {
    const settings = {
      stoppingMode: 'creep',
      chargeLimit: 90,
      scheduledChargeTime: '06:30',
      mirrorLeft: { x: 2, y: -3 },
      keys: [{ id: 9, kind: 'fob', name: 'Spare' }],
      preferences: { ...defaults.preferences, distance: 'km', timeFormat: '24h' },
    };
    expect(restoreSettings(settings)).toMatchObject(settings);
  });

  test('settings saved before these keys existed get the defaults', () => {
    expect(restoreSettings({ sentry: true })).toEqual({ ...defaults, sentry: true });
  });

  test.each([
    ['a stopping mode outside the union', { stoppingMode: 'teleport' }],
    ['a headlight mode outside the union', { headlights: 'lasers' }],
    ['a charge limit under the range', { chargeLimit: 10 }],
    ['a charge current over the range', { chargeCurrent: 500 }],
    ['a following distance over the range', { followingDistance: 12 }],
    ['a speed offset that is not a number', { speedOffset: 'fast' }],
    ['a schedule that is not a time', { scheduledChargeTime: '25:99' }],
    ['a mirror out of reach', { mirrorRight: { x: 40, y: 0 } }],
    ['a mirror with no position', { mirrorRight: null }],
    ['a steering wheel that is not an object', { steeringWheel: 3 }],
    ['an empty key list', { keys: [] }],
    ['keys of an unknown kind', { keys: [{ id: 1, kind: 'magic', name: 'x' }] }],
    ['keys that are not a list', { keys: { id: 1 } }],
  ])('drops %s', (_, settings) => {
    expect(restoreSettings(settings)).toEqual(defaults);
  });

  test.each([
    ['an unknown distance unit', { distance: 'parsecs' }],
    ['an unknown time format', { timeFormat: 'metric' }],
    ['the wrong type', { energyDisplay: 3 }],
  ])('drops a preference with %s', (_, preferences) => {
    expect(restoreSettings({ preferences })).toEqual(defaults);
  });

  test('one bad preference leaves the good ones', () => {
    const restored = restoreSettings({ preferences: { distance: 'km', temperature: 'K' } });
    expect(restored.preferences).toEqual({ ...defaults.preferences, distance: 'km' });
  });

  test('drops an unknown appearance and an out-of-range blue light value', () => {
    const { display } = restoreState(
      initialCarState,
      saved({ display: { appearance: 'neon', blueLightReduction: 400 } }),
    );
    expect(display).toEqual(initialCarState.display);
  });

  test('overlay modes and charge state always start fresh', () => {
    const restored = restoreState(
      initialCarState,
      saved({ overlayMode: 'car-wash', chargeState: 'charging', autopilot: 'autosteer' }),
    );
    expect(restored.overlayMode).toBe(null);
    expect(restored.chargeState).toBe('unplugged');
    expect(restored.autopilot).toBe('off');
  });
});

describe('climate', () => {
  const roundTrip = (...actions: CarAction[]) =>
    restoreState(initialCarState, serializeState(actions.reduce(carReducer, initialCarState)));

  test('a temperature saved before split becomes both temperatures', () => {
    const restored = restoreState(initialCarState, saved({ temperature: 72 }));
    expect(restored.climate).toMatchObject({ driverTemp: 72, passengerTemp: 72, isSplit: false });
  });

  test('preferences come back after a reload', () => {
    const restored = roundTrip(
      { type: 'climate/options', options: { isSplit: true, overheatProtection: 'no-ac' } },
      { type: 'climate/temperature', zone: 'passenger', delta: 5 },
      { type: 'climate/cabin', patch: { fanSpeed: 8, airflow: 'face-feet', recirculate: true } },
      { type: 'climate/seat', seat: 'driver', kind: 'cool' },
      { type: 'climate/seat', seat: 'rear-right', kind: 'heat' },
      { type: 'climate/options', options: { wheel: 'on' } },
    );

    expect(restored.climate).toMatchObject({
      isSplit: true,
      driverTemp: 70,
      passengerTemp: 75,
      overheatProtection: 'no-ac',
      wheel: 'on',
    });
    expect(restored.climate.cabin).toMatchObject({
      isAuto: false,
      fanSpeed: 8,
      airflow: 'face-feet',
      recirculate: true,
    });
    expect(restored.climate.seats).toMatchObject({ driver: -3, 'rear-right': 3 });
  });

  test('climate modes and defrost never come back', () => {
    const restored = roundTrip(
      { type: 'climate/mode', mode: 'dog' },
      { type: 'climate/defrost', window: 'rear' },
    );
    expect(restored.climate.mode).toBe(null);
    expect(restored.climate.rearDefrost).toBe(false);
  });

  test('a reload during front defrost returns the settings from before it', () => {
    const restored = roundTrip(
      { type: 'climate/cabin', patch: { fanSpeed: 2, airflow: 'feet' } },
      { type: 'climate/defrost', window: 'front' },
    );
    expect(restored.climate.beforeDefrost).toBe(null);
    expect(restored.climate.cabin).toMatchObject({ fanSpeed: 2, airflow: 'feet' });
  });

  test.each([
    ['a wild fan', { cabin: { fanSpeed: 40 } }],
    ['a fractional fan', { cabin: { fanSpeed: 2.5 } }],
    ['an unknown airflow', { cabin: { airflow: 'ceiling' } }],
    ['a level off the scale', { seats: { driver: 9 } }],
    ['a fractional level', { seats: { driver: 1.5 } }],
    ['cooling on a rear seat', { seats: { 'rear-left': -2 } }],
    ['an unknown wheel setting', { wheel: 'warm' }],
    ['an unknown overheat setting', { overheatProtection: 'sometimes' }],
    ['the wrong shape', 'hot'],
  ])('%s is dropped', (_name, climate) => {
    expect(restoreState(initialCarState, saved({ climate })).climate).toEqual(initialClimate);
  });

  test('a passenger temperature only counts when split', () => {
    const notSplit = restoreState(
      initialCarState,
      saved({ climate: { driverTemp: 65, passengerTemp: 80 } }),
    );
    expect(notSplit.climate.passengerTemp).toBe(65);

    const badPassenger = restoreState(
      initialCarState,
      saved({ climate: { isSplit: true, driverTemp: 65, passengerTemp: 900 } }),
    );
    expect(badPassenger.climate.passengerTemp).toBe(65);
  });
});

describe('dock', () => {
  const moved = carReducer(initialCarState, { type: 'dock/move', item: 'arcade', delta: -1 });

  test('a customized dock comes back after a reload', () => {
    const restored = restoreState(initialCarState, serializeState(moved));
    expect(restored.dockByProfile).toEqual(moved.dockByProfile);
  });

  test.each([
    ['an unknown app', ['spaceship']],
    ['a missing app', DOCK.slice(1)],
    ['a duplicate app', [...DOCK.slice(1), DOCK[1]]],
    ['the wrong shape', 'camera'],
  ])('%s falls back to the default dock', (_name, order) => {
    const restored = restoreState(initialCarState, saved({ dockByProfile: { 1: order } }));
    expect(restored.dockByProfile).toEqual({});
  });
});
