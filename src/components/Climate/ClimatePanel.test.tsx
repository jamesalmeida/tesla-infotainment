import { fireEvent, render, screen, within } from '@testing-library/react';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { initialClimate } from '../../state/climate';
import BtmNavBar from '../BtmNavBar/BtmNavBar';
import { ClimatePanel } from './ClimatePanel';
import { DogModeDisplay } from './DogModeDisplay';

function PanelWhenOpen() {
  const isOpen = useCar((state) => state.activeModal === 'climate');
  return isOpen ? <ClimatePanel /> : null;
}

const renderBar = (state: CarState = initialCarState) =>
  render(
    <CarStateProvider initialState={state}>
      <BtmNavBar />
      <PanelWhenOpen />
      <DogModeDisplay />
    </CarStateProvider>,
  );

const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Climate controls/ }));
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const pressed = (name: string | RegExp) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed');

test('the temperature number opens and closes the panel', () => {
  renderBar();
  openPanel();
  expect(screen.getByRole('heading', { name: 'Climate' })).toBeInTheDocument();
  openPanel();
  expect(screen.queryByRole('heading', { name: 'Climate' })).not.toBeInTheDocument();
});

test('the bottom bar arrows step the driver temperature', () => {
  renderBar();
  fireEvent.click(screen.getByAltText('Increase temperature'));
  expect(screen.getByRole('button', { name: /^Climate controls/ })).toHaveTextContent('71');
});

test('the passenger control only appears when split', () => {
  renderBar();
  expect(screen.getAllByRole('button', { name: /^Climate controls/ })).toHaveLength(1);

  openPanel();
  press('Split');
  expect(screen.getAllByRole('button', { name: /^Climate controls/ })).toHaveLength(2);

  fireEvent.click(screen.getByAltText('Increase passenger temperature'));
  expect(screen.getByRole('button', { name: /passenger temperature 71/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /driver temperature 70/ })).toBeInTheDocument();
});

test('front defrost takes over the vents and gives them back', () => {
  renderBar();
  openPanel();
  press('Feet');
  expect(pressed('Feet')).toBe('true');

  press('Front Defrost');
  expect(pressed('Windshield')).toBe('true');
  expect(screen.getByRole('slider', { name: 'Fan speed' })).toHaveValue('10');

  press('Front Defrost');
  expect(pressed('Feet')).toBe('true');
  expect(screen.getByRole('slider', { name: 'Fan speed' })).toHaveValue('4');
});

test('Auto wakes a climate that is off', () => {
  renderBar({
    ...initialCarState,
    activeModal: 'climate',
    climate: { ...initialClimate, cabin: { ...initialClimate.cabin, isOn: false } },
  });
  expect(pressed('Climate power')).toBe('false');
  press('Auto');
  expect(pressed('Climate power')).toBe('true');
  expect(pressed('Auto')).toBe('true');
});

test('a seat tap reports its level, and only the front seats can cool', () => {
  renderBar();
  openPanel();
  press('Driver seat: Off');
  expect(screen.getByRole('button', { name: 'Driver seat: Heat 3' })).toBeInTheDocument();

  press('Cool passenger seat');
  expect(screen.getByRole('button', { name: 'Passenger seat: Cool 3' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Cool rear/i })).not.toBeInTheDocument();
});

test('climate modes are refused outside Park', () => {
  renderBar({ ...initialCarState, gear: 'D' });
  openPanel();
  press(/Dog Mode/);
  expect(screen.queryByRole('dialog', { name: 'Dog Mode' })).not.toBeInTheDocument();
});

test('Dog Mode shows the cabin temperature until it is exited', () => {
  renderBar();
  openPanel();
  press(/Dog Mode/);

  const display = screen.getByRole('dialog', { name: 'Dog Mode' });
  expect(within(display).getByText('70°')).toBeInTheDocument();

  fireEvent.click(within(display).getByRole('button', { name: 'Exit Dog Mode' }));
  expect(screen.queryByRole('dialog', { name: 'Dog Mode' })).not.toBeInTheDocument();
});
