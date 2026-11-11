import { autoRotation, cameraOptions, nextCamera, nextRotation } from './BackupCam';

const device = (deviceId: string, label: string, kind: MediaDeviceKind = 'videoinput') => ({
  deviceId,
  label,
  kind,
});

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

describe('choosing a camera', () => {
  test('lists only selectable video inputs', () => {
    expect(
      cameraOptions([
        device('front', 'Front Camera'),
        device('mic', 'Microphone', 'audioinput'),
        device('', 'No id'),
        device('back', 'Back Camera'),
      ]),
    ).toEqual([
      { id: 'front', label: 'Front Camera' },
      { id: 'back', label: 'Back Camera' },
    ]);
  });

  test('a camera with no label still gets a usable name', () => {
    expect(cameraOptions([device('cam', '')])).toEqual([{ id: 'cam', label: 'Camera' }]);
  });

  test('switching cycles through the detected cameras', () => {
    const cameras = [
      { id: 'front', label: 'Front Camera' },
      { id: 'back', label: 'Back Camera' },
    ];

    expect(nextCamera(cameras, 'front')).toEqual(cameras[1]);
    expect(nextCamera(cameras, 'back')).toEqual(cameras[0]);
    expect(nextCamera(cameras, null)).toEqual(cameras[0]);
  });

  test('one camera means no switch', () => {
    expect(nextCamera([{ id: 'only', label: 'Camera' }], 'only')).toBeNull();
  });
});
