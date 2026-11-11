import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { SeatButton } from './SeatButton';

function Seats() {
  const driver = useCar((state: CarState) => state.climate.seats.driver);
  return <output aria-label="driver seat">{String(driver)}</output>;
}

const renderSeat = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <SeatButton seat="driver" side="left" />
      <Seats />
    </CarStateProvider>,
  );

test('a tap opens heat and cool, and each sets the seat', () => {
  renderSeat();
  fireEvent.click(screen.getByRole('button', { name: /Driver seat heat and cool/ }));

  fireEvent.click(screen.getByRole('button', { name: 'Heat 3' }));
  expect(screen.getByLabelText('driver seat')).toHaveTextContent('3');
  expect(
    screen.getByRole('button', { name: 'Driver seat heat and cool, Heat 3' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Cool 2' }));
  expect(screen.getByLabelText('driver seat')).toHaveTextContent('-2');

  fireEvent.click(screen.getAllByRole('button', { name: 'Off' })[0]);
  expect(screen.getByLabelText('driver seat')).toHaveTextContent('0');
});

test('the popover closes on Escape', () => {
  renderSeat();
  fireEvent.click(screen.getByRole('button', { name: /Driver seat heat and cool/ }));
  expect(screen.getByRole('group', { name: /heating and cooling/ })).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(screen.queryByRole('group', { name: /heating and cooling/ })).not.toBeInTheDocument();
});
