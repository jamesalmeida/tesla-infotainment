import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import OutsideTemp from './OutsideTemp';

const renderTemp = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <OutsideTemp />
    </CarStateProvider>,
  );

beforeAll(() => {
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});

test('shows the sample temperature when location is unavailable', () => {
  renderTemp();
  expect(screen.getByRole('button', { name: /Outside temperature/ })).toHaveTextContent('72');
});

test('opens a forecast and air quality popover, and says the data is a sample', () => {
  renderTemp();
  fireEvent.click(screen.getByRole('button', { name: /Outside temperature/ }));

  const dialog = screen.getByRole('dialog', { name: 'Weather and air quality' });
  expect(dialog).toHaveTextContent('Mostly clear');
  expect(dialog).toHaveTextContent('High');
  expect(dialog).toHaveTextContent('Air quality');
  expect(dialog).toHaveTextContent('Good (42)');
  expect(dialog).toHaveTextContent('Sample weather');
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
});

test('Escape closes the popover', () => {
  renderTemp();
  fireEvent.click(screen.getByRole('button', { name: /Outside temperature/ }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
