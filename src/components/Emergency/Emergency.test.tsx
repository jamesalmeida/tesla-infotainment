import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { Safety } from '../Apps/CarSettings/components/Safety';
import { MapNavigation } from '../MapNavigation/MapNavigation';
import { Emergency } from './Emergency';

function Modal() {
  return (
    <output aria-label="modal">{useCar((state: CarState) => state.activeModal ?? 'none')}</output>
  );
}

test('the SOS button appears while the car is alarmed and opens the emergency screen', () => {
  render(
    <CarStateProvider initialState={{ ...initialCarState, sentryAlarm: true }}>
      <MapNavigation onWifiClick={() => {}} />
      <Modal />
    </CarStateProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Emergency SOS' }));
  expect(screen.getByLabelText('modal')).toHaveTextContent('sos');
});

test('the Safety panel opens the emergency screen', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <Safety />
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
