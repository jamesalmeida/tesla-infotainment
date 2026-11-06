import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import BatteryStatus from './BatteryStatus';

const renderBattery = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <BatteryStatus />
    </CarStateProvider>,
  );

test('shows the starting battery percentage', () => {
  renderBattery();
  expect(screen.getByText('69%')).toBeInTheDocument();
});

test('a tap switches between percent and range', () => {
  renderBattery();
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('214 mi')).toBeInTheDocument();
});
