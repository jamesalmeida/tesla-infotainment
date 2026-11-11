import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { Notice } from '../Notice/Notice';
import { SelfDrivingButton, SelfDrivingStatus } from './SelfDrivingButton';

function Autopilot() {
  return <output aria-label="autopilot">{useCar((state: CarState) => state.autopilot)}</output>;
}

const renderButton = (state: CarState = initialCarState) =>
  render(
    <CarStateProvider initialState={state}>
      <SelfDrivingButton />
      <Autopilot />
      <Notice />
    </CarStateProvider>,
  );

test('in Park it is shown but explains why it cannot start', () => {
  renderButton();
  fireEvent.click(screen.getByRole('button', { name: 'Start Self-Driving' }));

  expect(screen.getByLabelText('autopilot')).toHaveTextContent('off');
  expect(screen.getByText('Shift to Drive to engage')).toBeInTheDocument();
});

test('in Drive it starts self-driving, and a second press stops it', () => {
  renderButton({ ...initialCarState, gear: 'D' });

  fireEvent.click(screen.getByRole('button', { name: 'Start Self-Driving' }));
  expect(screen.getByLabelText('autopilot')).toHaveTextContent('autosteer');

  fireEvent.click(screen.getByRole('button', { name: 'Stop Self-Driving' }));
  expect(screen.getByLabelText('autopilot')).toHaveTextContent('off');
});

describe('in Drive', () => {
  const renderStatus = (state: CarState) =>
    render(
      <CarStateProvider initialState={state}>
        <SelfDrivingStatus />
        <Autopilot />
      </CarStateProvider>,
    );

  test('the name starts and stops it, and the menu picks the mode', () => {
    renderStatus({ ...initialCarState, gear: 'D' });

    fireEvent.click(screen.getByRole('button', { name: 'Start Self-Driving' }));
    expect(screen.getByLabelText('autopilot')).toHaveTextContent('autosteer');

    const mode = screen.getByLabelText('Self-Driving mode');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Sloth',
      'Chill',
      'Standard',
      'Hurry',
      'Mad Max',
    ]);
    fireEvent.change(mode, { target: { value: 'hurry' } });
    expect(mode).toHaveValue('hurry');
  });
});
