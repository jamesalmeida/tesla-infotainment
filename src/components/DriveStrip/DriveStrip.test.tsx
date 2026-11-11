import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { Notice } from '../Notice/Notice';
import { DRIVE_STRIP_LINGER_MS, DriveStrip, gearFromDrag } from './DriveStrip';
import { PedalButton } from '../PedalDeck/PedalDeck';

function Gear() {
  return <output aria-label="gear">{useCar((state: CarState) => state.gear)}</output>;
}

// The strip only shows with the brake down, so most tests start there.
const braking: CarState = { ...initialCarState, pedal: 'brake' };

const renderStrip = (state = braking) =>
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
  renderStrip({ ...braking, chargeState: 'charging' });
  drag(-60);
  expect(gear()).toBe('P');
  expect(screen.getByText(/Unplug the charge cable/)).toBeInTheDocument();
});

describe('showing the strip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithPedal = () =>
    render(
      <CarStateProvider initialState={initialCarState}>
        <DriveStrip />
        <PedalButton pedal="brake" label="Brake" hint="↓" />
        <Gear />
      </CarStateProvider>,
    );
  const brake = () => screen.getByRole('button', { name: /Brake/ });
  const visibleStrip = () => screen.queryByRole('slider', { name: 'Drive strip' });

  test('is hidden until the brake is pressed', () => {
    renderWithPedal();
    expect(visibleStrip()).not.toBeInTheDocument();

    fireEvent.pointerDown(brake());
    expect(visibleStrip()).toBeInTheDocument();
  });

  test('stays up for a while after the brake is let go, then hides', () => {
    renderWithPedal();
    fireEvent.pointerDown(brake());
    fireEvent.pointerUp(brake());

    act(() => {
      vi.advanceTimersByTime(DRIVE_STRIP_LINGER_MS - 100);
    });
    expect(visibleStrip()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(visibleStrip()).not.toBeInTheDocument();
  });

  test('hides once it has shifted the car', () => {
    renderWithPedal();
    fireEvent.pointerDown(brake());
    fireEvent.pointerUp(brake());

    drag(-40);
    expect(gear()).toBe('D');
    expect(visibleStrip()).not.toBeInTheDocument();
  });
});
