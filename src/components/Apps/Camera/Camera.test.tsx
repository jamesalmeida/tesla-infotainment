import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCarActions } from '../../../state/CarStateContext';
import { initialCarState, type CarState } from '../../../state/carState';
import { Camera } from './Camera';

vi.mock('../BackupCam/BackupCam', () => ({
  BackupCam: () => <div>Rear camera feed</div>,
}));

const renderCamera = (state: CarState = initialCarState) =>
  render(
    <CarStateProvider initialState={state}>
      <Camera />
    </CarStateProvider>,
  );

test('opens on the rear camera and switches to simulated views', () => {
  renderCamera();
  expect(screen.getByText('Rear camera feed')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Front' }));
  expect(screen.getByRole('img', { name: 'front camera' })).toBeInTheDocument();
  expect(screen.queryByText('Rear camera feed')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Left' }));
  expect(screen.getByRole('img', { name: 'left camera' })).toBeInTheDocument();
});

function ShiftToReverse() {
  const { selectGear } = useCarActions();
  return (
    <button type="button" onClick={() => selectGear('R')}>
      Shift to Reverse
    </button>
  );
}

test('Reverse always brings the rear view back', () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <Camera />
      <ShiftToReverse />
    </CarStateProvider>,
  );

  fireEvent.click(screen.getByRole('tab', { name: 'Right' }));
  expect(screen.getByRole('img', { name: 'right camera' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Shift to Reverse' }));
  expect(screen.getByText('Rear camera feed')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Rear' })).toHaveAttribute('aria-selected', 'true');
});
