import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { CarCards, cardAfterSwipe } from './CarCards';

vi.mock('../MusicPanel/MusicPanel', () => ({
  MusicPanel: () => <div>Media player</div>,
}));

const renderCards = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <CarCards />
    </CarStateProvider>,
  );

const swipe = (deltaX: number, deltaY = 0) => {
  const viewport = document.querySelector('[class*="viewport"]') as HTMLElement;
  fireEvent.pointerDown(viewport, { button: 0, pointerId: 7, clientX: 200, clientY: 100 });
  fireEvent.pointerUp(viewport, {
    button: 0,
    pointerId: 7,
    clientX: 200 + deltaX,
    clientY: 100 + deltaY,
  });
};

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
});

test('opens on the media card', () => {
  renderCards();
  expect(screen.getByText('Media player')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute('aria-selected', 'true');
});

test('the tire card shows the simulated pressures and the low corner', () => {
  renderCards();
  fireEvent.click(screen.getByRole('tab', { name: 'Tires' }));

  expect(screen.getByText('Front Left')).toBeInTheDocument();
  expect(screen.getByText('34 psi')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Low pressure in Rear Right');
  expect(screen.getByRole('alert')).toHaveTextContent('42 psi');
});

test('the trip card shows the current trip and the odometer', () => {
  renderCards();
  fireEvent.click(screen.getByRole('tab', { name: 'Trip' }));

  expect(screen.getByText('Current trip')).toBeInTheDocument();
  expect(screen.getByText('Energy used')).toBeInTheDocument();
  expect(screen.getByText('Odometer')).toBeInTheDocument();
  expect(screen.getByText('12,480 mi')).toBeInTheDocument();
});

test('a horizontal swipe moves to the next card', () => {
  renderCards();
  swipe(-120);
  expect(screen.getByRole('tab', { name: 'Tires' })).toHaveAttribute('aria-selected', 'true');
  swipe(-120);
  expect(screen.getByRole('tab', { name: 'Trip' })).toHaveAttribute('aria-selected', 'true');
});

test('a short or vertical drag leaves the card alone', () => {
  renderCards();
  swipe(-20);
  expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute('aria-selected', 'true');
  swipe(-120, 120);
  expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute('aria-selected', 'true');
});

test('the tab list moves with the arrow keys', () => {
  renderCards();
  const tabs = screen.getByRole('tablist', { name: 'Cards under the car' });
  fireEvent.keyDown(tabs, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Tires' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs, { key: 'ArrowLeft' });
  expect(screen.getByRole('tab', { name: 'Media' })).toHaveAttribute('aria-selected', 'true');
});

test.each([
  [0, -120, 0, 1],
  [2, 120, 0, 1],
  [1, -20, 0, 1],
  [1, -120, 120, 1],
  [0, 120, 0, 0],
  [2, -120, 0, 2],
])('swipe %i by (%i, %i) lands on %i', (index, deltaX, deltaY, expected) => {
  expect(cardAfterSwipe(index, deltaX, deltaY)).toBe(expected);
});

test('only the dots show, with no tab labels above the card', () => {
  renderCards();
  expect(screen.queryByText('Media')).not.toBeInTheDocument();
  expect(screen.queryByText('Trip')).not.toBeInTheDocument();
  expect(screen.getAllByRole('tab')).toHaveLength(3);
});
