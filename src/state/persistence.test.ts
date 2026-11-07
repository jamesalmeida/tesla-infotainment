import { initialCarState } from './carState';
import { restoreState } from './persistence';

const saved = (state: unknown, version = 1) => JSON.stringify({ version, state });

test('restores saved preferences', () => {
  const restored = restoreState(
    initialCarState,
    saved({
      temperature: 72,
      volume: 30,
      activeProfileId: 2,
      settings: { ...initialCarState.settings, sentry: true, wipers: { mode: 'manual', speed: 2 } },
      display: { brightness: 40, autoBrightness: false },
    }),
  );

  expect(restored.temperature).toBe(72);
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
      temperature: 900,
      volume: 'loud',
      settings: { sentry: 'yes', dashcam: true, wipers: { mode: 'manual', speed: 9 } },
      display: { brightness: -4 },
    }),
  );

  expect(restored.temperature).toBe(initialCarState.temperature);
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
