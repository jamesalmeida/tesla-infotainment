import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { MapNavigation } from '../MapNavigation/MapNavigation';
import { Emergency } from './Emergency';

function Modal() {
  return (
    <output aria-label="modal">{useCar((state: CarState) => state.activeModal ?? 'none')}</output>
  );
}

test('the SOS button opens the emergency screen', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <MapNavigation onWifiClick={() => {}} />
      <Modal />
    </CarStateProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Emergency SOS' }));
  expect(screen.getByLabelText('modal')).toHaveTextContent('sos');
});

test('the emergency screen says it is a simulation and runs a demo call', () => {
  vi.useFakeTimers();
  render(
    <CarStateProvider initialState={initialCarState}>
      <Emergency />
    </CarStateProvider>,
  );

  expect(screen.getByRole('note')).toHaveTextContent('nothing is actually dialled');
  fireEvent.click(screen.getByRole('button', { name: 'Start demo call' }));
  expect(screen.getByRole('button', { name: 'Demo call 4' })).toBeInTheDocument();

  for (let second = 0; second < 4; second += 1) {
    act(() => vi.advanceTimersByTime(1000));
  }
  expect(screen.getByRole('button', { name: 'Start demo call' })).toBeInTheDocument();
  vi.useRealTimers();
});
