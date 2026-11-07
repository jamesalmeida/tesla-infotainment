import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState, type Preferences } from '../../state/carState';
import OutsideTemp from '../OutsideTemp/OutsideTemp';
import Clock from './Clock';

const withPreferences = (preferences: Partial<Preferences>) => ({
  ...initialCarState,
  settings: {
    ...initialCarState.settings,
    preferences: { ...initialCarState.settings.preferences, ...preferences },
  },
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 1, 15, 5));
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test.each([
  ['12h', /^3:05\sPM$/],
  ['24h', /^15:05$/],
] as const)('the clock reads %s', (timeFormat, expected) => {
  render(
    <CarStateProvider initialState={withPreferences({ timeFormat })}>
      <Clock />
    </CarStateProvider>,
  );
  expect(screen.getByText(expected)).toBeInTheDocument();
});

test.each([
  ['F', '65°F'],
  ['C', '18°C'],
] as const)('the outside temperature reads in %s', async (temperature, expected) => {
  render(
    <CarStateProvider initialState={withPreferences({ temperature })}>
      <OutsideTemp />
    </CarStateProvider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByText(expected)).toBeInTheDocument();
});
