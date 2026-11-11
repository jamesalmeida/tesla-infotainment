import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { ParkNavCard, ParkViewHandle, shouldLeaveParkView } from './ParkView';

test.each([
  [-120, true],
  [-40, true],
  [-20, false],
  [0, true],
  [4, true],
  [30, false],
])('a handle drag of %ipx leaves Park view: %s', (deltaX, expected) => {
  expect(shouldLeaveParkView(deltaX)).toBe(expected);
});

test('dragging the handle back towards the middle brings the map back', () => {
  const onExit = vi.fn();
  render(<ParkViewHandle onExit={onExit} />);
  const handle = screen.getByRole('button', { name: 'Show the map' });

  fireEvent.pointerDown(handle, { pointerId: 1, clientX: 800 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: 790 });
  expect(onExit).not.toHaveBeenCalled();

  fireEvent.pointerDown(handle, { pointerId: 1, clientX: 800 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: 700 });
  expect(onExit).toHaveBeenCalledTimes(1);
});

test('the Navigate card returns to the map, and says so when Home is not set', () => {
  const onExit = vi.fn();
  render(
    <CarStateProvider initialState={initialCarState}>
      <ParkNavCard onExit={onExit} />
    </CarStateProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
  expect(onExit).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Home' }));
  expect(onExit).toHaveBeenCalledTimes(2);
});
