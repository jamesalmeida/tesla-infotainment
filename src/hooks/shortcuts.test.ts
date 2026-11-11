import { afterEach } from 'vitest';
import { findShortcut, isTextEntry, keyboardMode } from './shortcuts';
import { claimKeyboard, releaseKeyboard } from './keyboardClaim';

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return findShortcut(event);
};

const input = (type: string) => {
  const element = document.createElement('input');
  element.type = type;
  return element;
};

afterEach(() => {
  releaseKeyboard();
});

test('letters and digits select gears, in any case', () => {
  expect(press('d')?.description).toBe('Drive');
  expect(press('4')?.description).toBe('Drive');
});

test.each(['metaKey', 'ctrlKey', 'altKey'])('%s leaves the key to the browser', (modifier) => {
  expect(press('r', { [modifier]: true })).toBeUndefined();
  expect(press('D', { shiftKey: true, [modifier]: true })).toBeUndefined();
});

test('a held key is not a new press', () => {
  expect(press('H', { shiftKey: true, repeat: true })).toBeUndefined();
});

test('text fields keep their keys, but a focused slider does not', () => {
  expect(press('d', {}, input('text'))).toBeUndefined();
  expect(press('H', { shiftKey: true }, document.createElement('textarea'))).toBeUndefined();
  expect(press('H', { shiftKey: true }, input('range'))?.description).toBe('Hazard lights');
});

test('a running game owns the keyboard', () => {
  claimKeyboard();
  expect(keyboardMode(document.body)).toBe('game');
  expect(press('d')).toBeUndefined();
  releaseKeyboard();
  expect(keyboardMode(document.body)).toBe('normal');
  expect(press('d')?.description).toBe('Drive');
});

test('media keys stay with a text field while typing', () => {
  expect(press('>', { shiftKey: true })?.description).toBe('Next track');
  expect(press('>', { shiftKey: true }, input('text'))).toBeUndefined();
});

test('only text entry counts as typing', () => {
  expect(isTextEntry(input('search'))).toBe(true);
  expect(isTextEntry(input('checkbox'))).toBe(false);
  expect(isTextEntry(document.body)).toBe(false);
  expect(isTextEntry(null)).toBe(false);
});
