import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { setCompartmentAnchors } from '../VehicleModel/compartmentAnchors';
import { Pedals } from './CarStatus';
import { CompartmentControls } from './CompartmentControls';

afterEach(() => {
  act(() => setCompartmentAnchors({ frunk: null, trunk: null }));
});

const leaderLines = () => [
  ...document.querySelectorAll<SVGLineElement>('.compartmentLeaders line'),
];

test('the leader lines stay hidden until the car reports where its lids are', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <CompartmentControls />
    </CarStateProvider>,
  );

  expect(leaderLines().map((line) => line.style.visibility)).toEqual(['hidden', 'hidden']);
});

test('each label gets a line to its lid, with its bar facing that lid', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <CompartmentControls />
    </CarStateProvider>,
  );
  const frunk = screen.getByRole('button', { name: /Frunk/ });
  const trunk = screen.getByRole('button', { name: /Trunk/ });

  act(() => setCompartmentAnchors({ frunk: { x: 100, y: 300 }, trunk: { x: 300, y: 280 } }));
  expect(leaderLines().map((line) => line.style.visibility)).toEqual(['visible', 'visible']);
  expect(leaderLines()[0].getAttribute('y2')).toBe('300');
  expect(frunk.dataset.side).toBe('left');
  expect(trunk.dataset.side).toBe('right');

  // Turned around, the trunk is on the left, so the two labels swap sides.
  act(() => setCompartmentAnchors({ frunk: { x: 320, y: 300 }, trunk: { x: 90, y: 280 } }));
  expect(frunk.dataset.side).toBe('right');
  expect(trunk.dataset.side).toBe('left');
});

function Signal() {
  const signal = useCar((state) => state.signal);
  return <output aria-label="signal">{signal}</output>;
}

test('the buttons beside the on-screen pedals work the turn signals', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <Pedals />
      <Signal />
    </CarStateProvider>,
  );
  const left = screen.getByRole('button', { name: 'Left turn signal' });

  fireEvent.click(left);
  expect(screen.getByLabelText('signal')).toHaveTextContent('left');
  expect(left).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Right turn signal' }));
  expect(screen.getByLabelText('signal')).toHaveTextContent('right');

  fireEvent.click(screen.getByRole('button', { name: 'Right turn signal' }));
  expect(screen.getByLabelText('signal')).toHaveTextContent('off');
});
