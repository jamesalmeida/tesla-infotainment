import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { NO_ANCHORS, setCompartmentAnchors } from '../VehicleModel/compartmentAnchors';
import { Pedals } from './CarStatus';
import { CompartmentControls } from './CompartmentControls';

afterEach(() => {
  act(() => setCompartmentAnchors(NO_ANCHORS));
});

// The first two lines run to the lids; the third is the charge port's.
const leaderLines = () =>
  [...document.querySelectorAll<SVGLineElement>('.compartmentLeaders line')].slice(0, 2);

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

  act(() =>
    setCompartmentAnchors({
      frunk: { x: 100, y: 300 },
      trunk: { x: 300, y: 280 },
      chargePort: null,
      roof: { x: 200, y: 260 },
    }),
  );
  expect(leaderLines().map((line) => line.style.visibility)).toEqual(['visible', 'visible']);
  expect(leaderLines()[0].getAttribute('y2')).toBe('300');
  expect(frunk.dataset.side).toBe('left');
  expect(trunk.dataset.side).toBe('right');
  // The lock has its own line, down to the roof.
  const lockLine = document.querySelectorAll<SVGLineElement>('.compartmentLeaders line')[3];
  expect(lockLine.style.visibility).toBe('visible');
  expect(lockLine.getAttribute('y2')).toBe('260');

  // Turned around, the trunk is on the left, so the two labels swap sides.
  act(() =>
    setCompartmentAnchors({
      frunk: { x: 320, y: 300 },
      trunk: { x: 90, y: 280 },
      chargePort: null,
      roof: null,
    }),
  );
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

test('the charge port button follows the port and opens it', () => {
  function Port() {
    const open = useCar((state) => state.chargePortOpen);
    return <output aria-label="port">{open ? 'open' : 'shut'}</output>;
  }
  render(
    <CarStateProvider initialState={initialCarState}>
      <CompartmentControls />
      <Port />
    </CarStateProvider>,
  );
  // Hidden until the car reports the port, so it has no accessible name to find it by yet.
  const button = document.querySelector<HTMLButtonElement>('.chargePortBtn')!;
  expect(button.style.visibility).toBe('hidden');

  act(() =>
    setCompartmentAnchors({
      frunk: null,
      trunk: null,
      chargePort: { x: 200, y: 150, side: 1 },
      roof: null,
    }),
  );
  expect(button.style.visibility).toBe('visible');

  fireEvent.click(screen.getByRole('button', { name: 'Open charge port' }));
  expect(screen.getByLabelText('port')).toHaveTextContent('open');
  expect(screen.getByRole('button', { name: 'Close charge port' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Turned so the port faces away, the button goes.
  act(() => setCompartmentAnchors(NO_ANCHORS));
  expect(button.style.visibility).toBe('hidden');
});
