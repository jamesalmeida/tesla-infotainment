import { autoRotation, nextRotation } from './BackupCam';

describe('standing the picture up', () => {
  test.each([
    ['a landscape frame on a landscape screen', { width: 1280, height: 720 }, false, true, 0],
    [
      'a portrait frame on a landscape screen, on a touch device',
      { width: 720, height: 1280 },
      false,
      true,
      90,
    ],
    ['a landscape frame on an upright phone', { width: 1280, height: 720 }, true, true, 0],
    ['a portrait frame on a laptop', { width: 720, height: 1280 }, false, false, 0],
    ['a frame with no size yet', { width: 0, height: 0 }, false, true, 0],
  ] as const)('%s', (_name, frame, portrait, touch, expected) => {
    expect(autoRotation(frame, portrait, touch)).toBe(expected);
  });

  test('the rotate button steps a quarter turn at a time', () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(270)).toBe(0);
  });
});
