import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { CarStateProvider, useCarActions } from '../state/CarStateContext';
import { initialCarState } from '../state/carState';
import { useCarSounds } from './useCarSounds';

vi.mock('../apps/carSounds', () => ({
  playCarSound: vi.fn(),
  playLockChime: vi.fn(),
  startIndicator: vi.fn(),
  stopIndicator: vi.fn(),
  setIndicatorVolume: vi.fn(),
}));

import { playCarSound, playLockChime, startIndicator, stopIndicator } from '../apps/carSounds';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CarStateProvider initialState={initialCarState}>{children}</CarStateProvider>
);

const renderSounds = () =>
  renderHook(
    () => {
      useCarSounds();
      return useCarActions();
    },
    { wrapper },
  );

beforeEach(() => {
  vi.mocked(playCarSound).mockClear();
  vi.mocked(playLockChime).mockClear();
  vi.mocked(startIndicator).mockClear();
  vi.mocked(stopIndicator).mockClear();
});

test('locking plays the chime, and opening the trunk plays the door sound', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleLock());
  act(() => result.current.toggleLock());
  expect(playLockChime).toHaveBeenCalledTimes(1);

  act(() => result.current.toggleCompartment('trunk'));
  expect(playCarSound).toHaveBeenCalledWith('door', 50);
});

test('a door opening and shutting makes the same sound as the trunk', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleDoor('lf'));
  expect(playCarSound).toHaveBeenCalledWith('door', 50);
  vi.mocked(playCarSound).mockClear();

  act(() => result.current.toggleDoor('lf'));
  expect(playCarSound).toHaveBeenCalledWith('door', 50);
});

test('a turn signal ticks, and shifting gear is silent', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleLeftSignal());
  expect(startIndicator).toHaveBeenCalledWith(50);

  act(() => result.current.selectGear('D'));
  expect(playCarSound).not.toHaveBeenCalled();
});

test('opening a door chimes only when the car is not in Park', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleDoor('lf'));
  expect(playCarSound).not.toHaveBeenCalledWith('doorAjar', 50);
  act(() => result.current.toggleDoor('lf'));

  act(() => result.current.selectGear('D'));
  act(() => result.current.toggleDoor('rf'));
  expect(playCarSound).toHaveBeenCalledWith('doorAjar', 50);
});

test('muting car sounds silences every chime', () => {
  const { result } = renderSounds();
  act(() => result.current.setSettings({ soundsEnabled: false }));
  vi.mocked(playCarSound).mockClear();
  vi.mocked(playLockChime).mockClear();

  act(() => result.current.toggleLock());
  act(() => result.current.toggleCompartment('frunk'));
  act(() => result.current.toggleLeftSignal());

  expect(playCarSound).not.toHaveBeenCalled();
  expect(playLockChime).not.toHaveBeenCalled();
  expect(startIndicator).not.toHaveBeenCalled();
});

test('the indicator stops when the signal turns off, and never layers', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleLeftSignal());
  act(() => result.current.toggleRightSignal());
  act(() => result.current.toggleHazards());
  expect(startIndicator).toHaveBeenCalledTimes(1);
  expect(stopIndicator).not.toHaveBeenCalled();

  act(() => result.current.toggleHazards());
  act(() => result.current.toggleRightSignal());
  expect(stopIndicator).toHaveBeenCalledTimes(1);
});

test('hazards alone start and stop the indicator', () => {
  const { result } = renderSounds();

  act(() => result.current.toggleHazards());
  expect(startIndicator).toHaveBeenCalledTimes(1);
  act(() => result.current.toggleHazards());
  expect(stopIndicator).toHaveBeenCalledTimes(1);
});
