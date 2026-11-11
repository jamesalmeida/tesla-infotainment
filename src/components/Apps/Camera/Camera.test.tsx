import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Camera } from './Camera';

vi.mock('../BackupCam/BackupCam', () => ({
  BackupCam: () => <div>Device camera</div>,
}));

test('shows the one device camera, with no view picker', () => {
  render(<Camera />);
  expect(screen.getByText('Device camera')).toBeInTheDocument();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
});
