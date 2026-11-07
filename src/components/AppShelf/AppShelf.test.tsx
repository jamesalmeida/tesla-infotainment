import { fireEvent, render, screen, within } from '@testing-library/react';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { dockOrder, initialCarState, type CarState } from '../../state/carState';
import { AppShelf } from './AppShelf';

function State({ read }: { read: (state: CarState) => unknown }) {
  return <output aria-label="state">{JSON.stringify(useCar(read))}</output>;
}

const renderShelf = (read: (state: CarState) => unknown, state = initialCarState) =>
  render(
    <CarStateProvider initialState={state}>
      <AppShelf />
      <State read={read} />
    </CarStateProvider>,
  );

const press = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const stateText = () => JSON.parse(screen.getByLabelText('state').textContent ?? 'null');

test.each([
  [{ mode: 'off' }, { mode: 'auto' }, /Wipers: Off/],
  [{ mode: 'auto' }, { mode: 'manual', speed: 1 }, /Wipers: Auto/],
  [{ mode: 'manual', speed: 3 }, { mode: 'manual', speed: 4 }, /Wipers: Speed 3/],
  [{ mode: 'manual', speed: 4 }, { mode: 'off' }, /Wipers: Speed 4/],
] as const)('wipers step through the shared setting from %j', (wipers, expected, name) => {
  renderShelf((state) => state.settings.wipers, {
    ...initialCarState,
    settings: { ...initialCarState.settings, wipers },
  });
  press(name);
  expect(stateText()).toEqual(expected);
});

test('defrost toggles and stays on screen', () => {
  renderShelf((state) => state.climate.cabin.airflow);
  press(/Defrost Front: Off/);
  expect(screen.getByRole('button', { name: /Defrost Front: On/ })).toBeInTheDocument();
  expect(stateText()).toBe('windshield');

  press(/Defrost Rear: Off/);
  expect(screen.getByRole('button', { name: /Defrost Rear: On/ })).toBeInTheDocument();
});

test('each seat icon cycles its own level', () => {
  renderShelf((state) => state.climate.seats);
  press(/Left Seat: Off/);
  press(/Left Seat: Heat 3/);
  press(/Right Seat: Off/);
  expect(stateText()).toMatchObject({ driver: 2, passenger: 3 });
});

test('the fan steps up and shows its speed', () => {
  renderShelf((state) => state.climate.cabin.fanSpeed);
  press(/Fan: Speed 4/);
  expect(stateText()).toBe(5);
});

test('no quick control reports itself as unavailable', () => {
  renderShelf(() => null);
  ['Wipers', 'Defrost Front', 'Defrost Rear', 'Left Seat', 'Right Seat', 'Fan'].forEach((label) =>
    press(new RegExp(`^${label}:`)),
  );
  expect(screen.queryByText(/isn't available/)).not.toBeInTheDocument();
});

test('Customize reorders the dock, and each end has nowhere further to go', () => {
  renderShelf(dockOrder);
  press(/^Customize$/);

  const order = screen.getByRole('list', { name: 'Dock order' });
  expect(within(order).getByRole('button', { name: 'Move Camera left' })).toBeDisabled();
  expect(within(order).getByRole('button', { name: 'Move Podcasts right' })).toBeDisabled();

  press(/Move Arcade left/);
  expect(stateText().slice(0, 2)).toEqual(['arcade', 'camera']);
  expect(within(order).getByRole('button', { name: 'Move Arcade left' })).toBeDisabled();
});
