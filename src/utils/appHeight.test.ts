import { expect, test } from 'vitest';
import { appHeight } from './appHeight';

// An iPad Pro 13" reports its screen in portrait, 1032 x 1376, however it is held.
const IPAD = { screenWidth: 1032, screenHeight: 1376 };

test('in a browser tab the viewport decides', () => {
  expect(appHeight({ standalone: false, innerWidth: 1376, innerHeight: 980, ...IPAD })).toBeNull();
});

test('opened from the Home Screen in landscape, the app fills the screen, not the short layout', () => {
  expect(appHeight({ standalone: true, innerWidth: 1376, innerHeight: 1012, ...IPAD })).toBe(1032);
});

test('in portrait the taller side is the height', () => {
  expect(appHeight({ standalone: true, innerWidth: 1032, innerHeight: 1356, ...IPAD })).toBe(1376);
});

test('never shorter than the viewport, and nothing without a screen size', () => {
  expect(appHeight({ standalone: true, innerWidth: 1376, innerHeight: 1040, ...IPAD })).toBe(1040);
  expect(
    appHeight({
      standalone: true,
      innerWidth: 800,
      innerHeight: 600,
      screenWidth: 0,
      screenHeight: 0,
    }),
  ).toBeNull();
});
