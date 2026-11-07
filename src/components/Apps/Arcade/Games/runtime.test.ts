import {
  STEP_SECONDS,
  approach,
  consumeFrame,
  createRandom,
  fitWorld,
  gamepadButtons,
  isTextEntry,
  keyToButton,
  toWorld,
  type PadState,
} from './runtime';

const pad = (axes: number[], pressed: number[] = []): PadState => ({
  axes,
  buttons: Array.from({ length: 17 }, (_, index) => ({
    pressed: pressed.includes(index),
    touched: false,
    value: 0,
  })),
});

test('a frame turns into whole steps and carries the remainder', () => {
  const { steps, carried } = consumeFrame(0, STEP_SECONDS * 2.5);
  expect(steps).toBe(2);
  expect(carried).toBeCloseTo(STEP_SECONDS / 2);
});

test('a long stall simulates at most a tenth of a second', () => {
  expect(consumeFrame(0, 30).steps).toBe(6);
});

test('the same seed replays the same numbers', () => {
  const first = createRandom(7);
  const second = createRandom(7);
  expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  expect(first()).toBeLessThan(1);
});

test('approach stops at the target', () => {
  expect(approach(0, 1, 0.4)).toBeCloseTo(0.4);
  expect(approach(0.9, 1, 0.4)).toBe(1);
  expect(approach(1, 0, 2)).toBe(0);
});

test('only the arrow keys are game buttons, leaving the gear letters alone', () => {
  expect(keyToButton('ArrowUp')).toBe('up');
  expect(keyToButton('d')).toBeUndefined();
});

test('text fields keep their keys but range sliders do not count as text', () => {
  const text = document.createElement('input');
  const range = document.createElement('input');
  range.type = 'range';
  expect(isTextEntry(text)).toBe(true);
  expect(isTextEntry(range)).toBe(false);
  expect(isTextEntry(document.createElement('textarea'))).toBe(true);
  expect(isTextEntry(document.body)).toBe(false);
});

test('a gamepad drives the same buttons from the d-pad or the stick', () => {
  expect([...gamepadButtons(pad([0, 0], [14]))]).toEqual(['left']);
  expect([...gamepadButtons(pad([0.9, -0.9]))]).toEqual(['right', 'up']);
  expect(gamepadButtons(pad([0.2, 0.2])).size).toBe(0);
});

test('fitWorld letterboxes and toWorld undoes it', () => {
  const view = fitWorld({ width: 400, height: 100 }, 10, 5);
  expect(view).toEqual({ scale: 20, offsetX: 100, offsetY: 0 });
  expect(toWorld({ x: 120, y: 40 }, view)).toEqual({ x: 1, y: 2 });
});
