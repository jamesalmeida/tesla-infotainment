import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { RESTART_HOLD_MS, SLEEP_AFTER_MS, SleepOverlay, WAKE_MS } from './SleepOverlay';

function Restarting() {
  return (
    <output aria-label="restarting">{useCar((state: CarState) => state.restartSecondsLeft)}</output>
  );
}

const renderSleep = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <SleepOverlay />
      <Restarting />
    </CarStateProvider>,
  );

const sleep = () => act(() => vi.advanceTimersByTime(SLEEP_AFTER_MS));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('a parked car sleeps after a quiet stretch', () => {
  renderSleep();
  expect(screen.queryByText(/Touch anywhere to wake/)).not.toBeInTheDocument();
  sleep();
  expect(screen.getByText(/Touch anywhere to wake/)).toBeInTheDocument();
});

test('any touch wakes it with the welcome animation', () => {
  renderSleep();
  sleep();

  fireEvent.pointerDown(document.body);
  expect(screen.getByText('Welcome back')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(WAKE_MS));
  expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
});

test('activity keeps it awake', () => {
  renderSleep();
  act(() => vi.advanceTimersByTime(SLEEP_AFTER_MS - 1000));
  fireEvent.keyDown(document, { key: 'a' });
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByText(/Touch anywhere to wake/)).not.toBeInTheDocument();
});

test('holding the logo restarts the display', () => {
  renderSleep();
  sleep();

  const logo = screen.getByRole('button', { name: /Tesla logo/ });
  fireEvent.pointerDown(logo);
  act(() => vi.advanceTimersByTime(RESTART_HOLD_MS));

  expect(screen.getByLabelText('restarting')).toHaveTextContent('3');
  expect(screen.queryByText(/Touch anywhere to wake/)).not.toBeInTheDocument();
});

test('a tap on the logo wakes instead of restarting', () => {
  renderSleep();
  sleep();

  const logo = screen.getByRole('button', { name: /Tesla logo/ });
  fireEvent.pointerDown(logo);
  fireEvent.pointerUp(logo);

  expect(screen.getByText('Welcome back')).toBeInTheDocument();
  expect(screen.getByLabelText('restarting')).toHaveTextContent('0');
});

test('a driving or charging car never sleeps', () => {
  render(
    <CarStateProvider initialState={{ ...initialCarState, gear: 'D' }}>
      <SleepOverlay />
    </CarStateProvider>,
  );
  sleep();
  expect(screen.queryByText(/Touch anywhere to wake/)).not.toBeInTheDocument();
});
