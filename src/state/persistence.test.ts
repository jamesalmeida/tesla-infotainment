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
