import { render, screen } from '@testing-library/react';
import BatteryStatus from './components/BatteryStatus/BatteryStatus';

test('shows the starting battery percentage', () => {
  render(<BatteryStatus />);
  expect(screen.getByText('69%')).toBeInTheDocument();
});
