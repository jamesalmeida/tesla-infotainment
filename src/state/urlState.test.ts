import { describe, expect, test } from 'vitest';
import { initialCarState, SETTINGS_PANELS, type Surface } from './carState';
import { hashToSurface, isRearHash, layerOf, surfaceToHash } from './urlState';

describe('surfaces and hashes', () => {
  const ROUTES: [string, Surface][] = [
    ['#/', { kind: 'closed' }],
    ['#/camera', { kind: 'camera' }],
    ['#/bluetooth', { kind: 'app', app: 'bluetooth' }],
    ['#/apple-music', { kind: 'app', app: 'apple-music' }],
    ['#/settings/wifi', { kind: 'settings', panel: 'Wifi' }],
  ];

  test.each(ROUTES)('%s round-trips', (hash, surface) => {
    expect(surfaceToHash(surface)).toBe(hash);
    expect(hashToSurface(hash)).toEqual(surface);
  });

  test.each(SETTINGS_PANELS)('the %s panel round-trips', (panel) => {
    const surface: Surface = { kind: 'settings', panel };
    expect(hashToSurface(surfaceToHash(surface))).toEqual(surface);
  });

  test.each([
    ['', { kind: 'closed' }],
    ['#', { kind: 'closed' }],
    ['#/settings', { kind: 'settings', panel: 'Controls' }],
    ['#/car-settings', { kind: 'settings', panel: 'Controls' }],
    ['#/settings/WIFI', { kind: 'settings', panel: 'Wifi' }],
  ])('%j is understood', (hash, surface) => {
    expect(hashToSurface(hash)).toEqual(surface);
  });

  test.each([
    '#/nope',
    '#/settings/nope',
    '#/bluetooth/extra',
    '#/settings/wifi/extra',
    '#/camera/extra',
    '#//bluetooth',
    '#/constructor',
    '#/rear',
  ])('%s is not a surface', (hash) => {
    expect(hashToSurface(hash)).toBe(null);
  });

  test('the rear display has its own route', () => {
    expect(isRearHash('#/rear')).toBe(true);
    expect(isRearHash('#/bluetooth')).toBe(false);
  });
});

describe('history layers', () => {
  test.each([
    ['the map', initialCarState, 0],
    ['an app', { ...initialCarState, surface: { kind: 'camera' } as Surface }, 1],
    ['a modal', { ...initialCarState, activeModal: 'app-shelf' as const }, 2],
  ])('%s', (_name, state, layer) => {
    expect(layerOf(state)).toBe(layer);
  });
});
