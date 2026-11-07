import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider, useCar } from '../../../../state/CarStateContext';
import { initialCarState, type CarState } from '../../../../state/carState';
import { PaintShop } from './PaintShop';

function State() {
  return (
    <output aria-label="state">
      {JSON.stringify({
        paint: useCar((state: CarState) => state.settings.paint),
        wheels: useCar((state: CarState) => state.settings.wheelConfig),
        plate: useCar((state: CarState) => state.settings.licensePlate),
      })}
    </output>
  );
}

const renderShop = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <PaintShop />
      <State />
    </CarStateProvider>,
  );

const read = () => JSON.parse(screen.getByLabelText('state').textContent ?? '{}');

test('a paint choice updates the car', () => {
  renderShop();
  fireEvent.click(screen.getByRole('button', { name: 'Deep Blue' }));
  expect(read().paint).toBe('deep-blue');
});

test('wheels and the plate are real settings', () => {
  renderShop();
  fireEvent.click(screen.getByRole('button', { name: '20" Track' }));
  fireEvent.change(screen.getByLabelText(/Plate text/), { target: { value: 'demo 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(read().wheels).toBe('track-20');
  expect(read().plate).toBe('DEMO 1');
});

test('the plate is capped at eight characters', () => {
  renderShop();
  fireEvent.change(screen.getByLabelText(/Plate text/), {
    target: { value: 'TOO LONG PLATE' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(read().plate).toHaveLength(8);
});
