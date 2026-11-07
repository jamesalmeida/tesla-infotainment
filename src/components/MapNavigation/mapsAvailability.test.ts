import { describeMapsFailure, usableMapsKey, type MapsFailure } from './mapsAvailability';

test.each<[string, string | undefined, string | null]>([
  ['a real key', 'abc123', 'abc123'],
  ['surrounding spaces', ' abc123 ', 'abc123'],
  ['nothing', undefined, null],
  ['an empty key', '', null],
  ['a blank key', '   ', null],
  ['the .env.template placeholder', 'YOUR_API_KEY_HERE', null],
])('usableMapsKey handles %s', (_name, key, expected) => {
  expect(usableMapsKey(key)).toBe(expected);
});

const failures: MapsFailure[] = ['missingKey', 'authFailed', 'loadFailed'];

test.each(failures)('the deployed site says maps are unavailable for %s', (failure) => {
  const { title, detail } = describeMapsFailure(failure, false);
  expect(title).toBe('Maps are unavailable');
  expect(detail).not.toMatch(/\.env|key/i);
});

test('developers are told how to add a key', () => {
  const { detail } = describeMapsFailure('missingKey', true);
  expect(detail).toContain('.env.template');
  expect(detail).toContain('VITE_GOOGLE_MAPS_API_KEY');
});

test('each failure reads differently for developers', () => {
  const titles = failures.map((failure) => describeMapsFailure(failure, true).title);
  expect(new Set(titles).size).toBe(failures.length);
});
