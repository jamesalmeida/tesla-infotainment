import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// WebGL and the Google Maps loader are not available in jsdom, so stub the
// components that require a real browser environment.
vi.mock('./components/VehicleModel/VehicleModel', () => ({
  VehicleModel: () => null,
}));

vi.mock('./components/MapNavigation/MapNavigation', () => ({
  MapNavigation: () => null,
}));

test('renders the infotainment display', () => {
  render(<App />);
  expect(document.getElementById('displayBezel')).toBeInTheDocument();
});
