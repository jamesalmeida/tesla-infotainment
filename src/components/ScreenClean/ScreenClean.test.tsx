import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { HOLD_TO_EXIT_MS, ScreenClean } from './ScreenClean';

const renderMode = () =>
  render(
    <CarStateProvider initialState={{ ...initialCarState, overlayMode: 'screen-clean' }}>
      <ScreenClean />
    </CarStateProvider>,
  );

const exit = () => screen.getByRole('button', { name: 'Press and hold to exit' });
const isOn = () => screen.queryByRole('dialog', { name: 'Screen Clean Mode' }) !== null;
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('stays off until the mode is on', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <ScreenClean />
    </CarStateProvider>,
  );
  expect(isOn()).toBe(false);
});

test('taps do nothing, on the screen or on the button', () => {
  renderMode();
  fireEvent.click(screen.getByRole('dialog'));
  fireEvent.pointerDown(exit());
  fireEvent.pointerUp(exit());
  fireEvent.click(exit());
  wait(HOLD_TO_EXIT_MS * 2);
  expect(isOn()).toBe(true);
});

test('holding the button exits', () => {
  renderMode();
  fireEvent.pointerDown(exit());
  wait(HOLD_TO_EXIT_MS - 1);
  expect(isOn()).toBe(true);
  wait(1);
  expect(isOn()).toBe(false);
});

test.each(['pointerUp', 'pointerLeave', 'pointerCancel'] as const)(
  '%s before the end starts the hold over',
  (event) => {
    renderMode();
    fireEvent.pointerDown(exit());
    wait(HOLD_TO_EXIT_MS - 1);
    fireEvent[event](exit());
    wait(HOLD_TO_EXIT_MS);
    expect(isOn()).toBe(true);
  },
);

test.each([' ', 'Enter'])('holding the "%s" key exits as well', (key) => {
  renderMode();
  fireEvent.keyDown(exit(), { key });
  fireEvent.keyDown(exit(), { key, repeat: true });
  wait(HOLD_TO_EXIT_MS);
  expect(isOn()).toBe(false);
});

test('the exit button takes focus, so a keyboard can reach it', () => {
  renderMode();
  expect(exit()).toHaveFocus();
});
