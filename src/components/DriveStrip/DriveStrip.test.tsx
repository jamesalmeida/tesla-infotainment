import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { Notice } from '../Notice/Notice';
import { DriveStrip, gearFromDrag } from './DriveStrip';

function Gear() {
  return <output aria-label="gear">{useCar((state: CarState) => state.gear)}</output>;
}

const renderStrip = (state = initialCarState) =>
  render(
    <CarStateProvider initialState={state}>
      <DriveStrip />
      <Gear />
      <Notice />
    </CarStateProvider>,
  );

const strip = () => screen.getByRole('slider', { name: 'Drive strip' });
const gear = () => screen.getByLabelText('gear').textContent;

const drag = (deltaY: number) => {
  fireEvent.pointerDown(strip(), { button: 0, pointerId: 4, clientY: 200 });
  fireEvent.pointerUp(strip(), { button: 0, pointerId: 4, clientY: 200 + deltaY });
};

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
});

test.each([
  [-40, 'D'],
  [40, 'R'],
  [-10, null],
  [10, null],
  [-28, 'D'],
  [28, 'R'],
])('a drag of %i asks for %s', (deltaY, expected) => {
  expect(gearFromDrag(deltaY)).toBe(expected);
});

test('dragging up selects Drive', () => {
  renderStrip();
  drag(-60);
  expect(gear()).toBe('D');
});

test('dragging down selects Reverse and opens the camera', () => {
  renderStrip();
  drag(60);
  expect(gear()).toBe('R');
});

test('a short drag does not shift', () => {
  renderStrip();
  drag(-10);
  expect(gear()).toBe('P');
});

test('the arrow keys shift from the keyboard too', () => {
  renderStrip();
  fireEvent.keyDown(strip(), { key: 'ArrowUp' });
  expect(gear()).toBe('D');
  fireEvent.keyDown(strip(), { key: 'ArrowDown' });
  expect(gear()).toBe('R');
});

test('a charge cable refuses Drive and explains why', () => {
  renderStrip({ ...initialCarState, chargeState: 'charging' });
  drag(-60);
  expect(gear()).toBe('P');
  expect(screen.getByText(/Unplug the charge cable/)).toBeInTheDocument();
});
