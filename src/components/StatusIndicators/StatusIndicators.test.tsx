import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { HomeLinkStatus } from './StatusIndicators';

function Door() {
  const door = useCar((state) => state.homelink.door);
  return <output aria-label="door">{door}</output>;
}

const renderAt = (state: CarState) =>
  render(
    <CarStateProvider initialState={state}>
      <HomeLinkStatus />
      <Door />
    </CarStateProvider>,
  );

test('near home, the status bar names the remote and Activate sends it', () => {
  renderAt(initialCarState);
  expect(screen.getByText('Gate')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Activate HomeLink: Gate' }));
  expect(screen.getByLabelText('door')).toHaveTextContent('opening');
});

test('turned off in Settings, HomeLink leaves the status bar', () => {
  renderAt({
    ...initialCarState,
    settings: { ...initialCarState.settings, homelinkEnabled: false },
  });
  expect(screen.queryByRole('button', { name: /Activate HomeLink/ })).not.toBeInTheDocument();
});

test('away from home there is nothing to activate', () => {
  renderAt({ ...initialCarState, odometerMiles: initialCarState.homelink.homeOdometerMiles + 50 });
  expect(screen.queryByRole('button', { name: /Activate HomeLink/ })).not.toBeInTheDocument();
});
