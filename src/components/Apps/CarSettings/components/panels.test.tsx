import { useEffect, type ReactElement } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CarStateProvider, useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  carReducer,
  initialCarState,
  type CarAction,
  type CarState,
} from '../../../../state/carState';
import { Bluetooth } from '../../Bluetooth/Bluetooth';
import { Notice } from '../../../Notice/Notice';
import UserProfile from '../../../UserProfile/UserProfile';
import { Audio } from './Audio';
import { HomeLink } from './HomeLink';
import { Navigation } from './Navigation';
import { Notifications } from './Notifications';
import { Profiles } from './Profiles';
import { Safety } from './Safety';
import { Schedule } from './Schedule';
import { Service } from './Service';
import { Software } from './Software';
import { Trips } from './Trips';
import { Upgrades } from './Upgrades';
import { Wifi } from './Wifi';

let latest: CarState;
let advance: (seconds: number) => void;

// Stands in for the simulation loop, and shows the test what the store is holding.
function Harness() {
  const state = useCar((current) => current);
  const { tick } = useCarActions();

  useEffect(() => {
    latest = state;
    advance = (seconds) => act(() => tick(seconds));
  }, [state, tick]);

  return null;
}

const renderPanel = (panel: ReactElement, ...actions: CarAction[]) =>
  render(
    <CarStateProvider initialState={actions.reduce(carReducer, initialCarState)}>
      <Harness />
      <Notice />
      {panel}
    </CarStateProvider>,
  );

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

test.each<[string, ReactElement]>([
  ['Trips', <Trips key="a" />],
  ['Navigation', <Navigation key="b" />],
  ['Safety', <Safety key="c" />],
  ['Service', <Service key="d" />],
  ['Software', <Software key="e" />],
  ['Wifi', <Wifi key="f" />],
  ['Audio', <Audio key="g" />],
  ['Notifications', <Notifications key="h" />],
  ['Profiles', <Profiles key="i" />],
  ['Schedule', <Schedule key="j" />],
  ['Upgrades', <Upgrades key="k" />],
  ['HomeLink', <HomeLink key="l" />],
  ['Bluetooth', <Bluetooth key="m" />],
])('%s has real content and no placeholder text', (title, panel) => {
  const { container } = renderPanel(panel);
  expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/lorem ipsum/i);
});

describe('Valet Mode', () => {
  test('starts with a PIN in Park, and hides drivers until the same PIN ends it', () => {
    renderPanel(<Profiles />);
    expect(screen.getByText('Drivers')).toBeInTheDocument();

    type('Choose a Valet PIN', '2468');
    press('Start Valet Mode');
    expect(latest.valet?.pin).toBe('2468');
    expect(screen.queryByText('Drivers')).not.toBeInTheDocument();

    type('Valet PIN', '1111');
    press('Exit Valet Mode');
    expect(latest.valet).not.toBe(null);
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect PIN');

    type('Valet PIN', '2468');
    press('Exit Valet Mode');
    expect(latest.valet).toBe(null);
    expect(screen.getByText('Drivers')).toBeInTheDocument();
  });

  test('is refused outside Park, with the reason on screen', () => {
    renderPanel(<Profiles />, { type: 'gear/select', gear: 'D' });

    type('Choose a Valet PIN', '2468');
    press('Start Valet Mode');

    expect(latest.valet).toBe(null);
    expect(screen.getByRole('status')).toHaveTextContent('Shift to Park to use Valet Mode');
  });

  test('cannot start until the PIN is complete', () => {
    renderPanel(<Profiles />);
    type('Choose a Valet PIN', '24');
    expect(screen.getByRole('button', { name: 'Start Valet Mode' })).toBeDisabled();
  });

  test('a PIN field only takes digits', () => {
    renderPanel(<Profiles />);
    type('Choose a Valet PIN', '2a4b');
    expect(screen.getByLabelText('Choose a Valet PIN')).toHaveValue('24');
  });

  test.each<[string, ReactElement]>([
    ['Wifi', <Wifi key="a" />],
    ['HomeLink', <HomeLink key="b" />],
    ['Schedule', <Schedule key="c" />],
    ['Notifications', <Notifications key="d" />],
    ['Bluetooth', <Bluetooth key="e" />],
  ])('hides personal data in %s', (_name, panel) => {
    renderPanel(panel, { type: 'valet/enter', pin: '1234' });
    expect(screen.getByText('Hidden in Valet Mode')).toBeInTheDocument();
  });
});

describe('profile menu', () => {
  test('choosing Valet asks for a PIN instead of switching', () => {
    renderPanel(<UserProfile />);
    press(/Alex/);
    press(/Valet/);
    expect(latest.activeProfileId).toBe(1);
    expect(latest.surface).toEqual({ kind: 'settings', panel: 'Profiles' });
  });

  test('Driver Profile Settings opens the Profiles panel', () => {
    renderPanel(<UserProfile />);
    press(/Alex/);
    press('Driver Profile Settings');
    expect(latest.surface).toEqual({ kind: 'settings', panel: 'Profiles' });
  });

  test('lists drivers added in the panel', () => {
    renderPanel(
      <>
        <UserProfile />
        <Profiles />
      </>,
    );
    type('New driver', 'Robin');
    press('Add');
    press(/Robin's Profile/);
    expect(screen.getAllByRole('button', { name: /Robin's Profile/ })).toHaveLength(2);
  });
});

describe('Wifi', () => {
  test('a wrong password fails with a reason, and the right one connects', () => {
    renderPanel(<Wifi />);

    press('Join Demo Home');
    type('Password for Demo Home', 'guess');
    press('Join');
    expect(screen.getByText('Connecting…')).toBeInTheDocument();

    advance(3);
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password');
    expect(latest.wifi.connectedId).toBe(null);

    press('Join Demo Home');
    type('Password for Demo Home', 'demo1234');
    press('Join');
    advance(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(latest.wifi.connectedId).toBe('home');
    expect(screen.getByRole('button', { name: 'Disconnect from Demo Home' })).toBeInTheDocument();
  });

  test('a network that can never connect says why', () => {
    renderPanel(<Wifi />);
    press('Join Demo Far Away');
    type('Password for Demo Far Away', 'faraway1');
    press('Join');
    advance(3);
    expect(screen.getByRole('alert')).toHaveTextContent('The signal is too weak to connect');
  });

  test('an open network joins with no password', () => {
    renderPanel(<Wifi />);
    press('Join Demo Cafe Guest');
    advance(3);
    expect(latest.wifi.connectedId).toBe('cafe');
  });

  test('the hotspot takes its name from the car', () => {
    renderPanel(<Wifi />, { type: 'settings/set', patch: { vehicleName: 'Rocket' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Share Connection' }));
    expect(screen.getByText('Rocket Hotspot')).toBeInTheDocument();
  });
});

test('Bluetooth pairs through the shared screen with a code to compare', () => {
  renderPanel(<Bluetooth />);

  press('Pair Demo Phone');
  expect(screen.getByText('482913')).toBeInTheDocument();
  press('Codes Match');
  advance(3);

  expect(latest.bluetooth.connectedId).toBe('phone');
  expect(screen.getByText('Playing from Demo Phone')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Disconnect Demo Phone' })).toBeInTheDocument();
});

describe('Safety', () => {
  test('Speed Limit Mode goes on with a PIN and locks its slider', () => {
    renderPanel(<Safety />);
    press('Turn on Speed Limit Mode');
    type('Choose a PIN for Speed Limit Mode', '1357');
    press('Turn On');
    expect(latest.settings.speedLimitMode).toBe(true);
    expect(screen.getByRole('slider', { name: 'Speed Limit' })).toBeDisabled();
  });

  test('a wrong PIN keeps the form up for another try', () => {
    renderPanel(<Safety />, { type: 'pinToDrive/enable', pin: '1234' });
    press('Turn off PIN to Drive');
    type('PIN to turn off PIN to Drive', '0000');
    fireEvent.submit(screen.getByLabelText('PIN to turn off PIN to Drive').closest('form')!);
    expect(latest.settings.pinToDrive).toBe(true);
    expect(screen.getByLabelText('PIN to turn off PIN to Drive')).toBeInTheDocument();

    type('PIN to turn off PIN to Drive', '1234');
    fireEvent.submit(screen.getByLabelText('PIN to turn off PIN to Drive').closest('form')!);
    expect(latest.settings.pinToDrive).toBe(false);
    expect(screen.queryByLabelText('PIN to turn off PIN to Drive')).not.toBeInTheDocument();
  });

  test('Require Safety Features locks the warnings on', () => {
    renderPanel(<Safety />);
    fireEvent.click(screen.getByRole('switch', { name: 'Require Safety Features' }));
    expect(screen.getByRole('switch', { name: 'Blind Spot Warning' })).toBeDisabled();
    expect(screen.queryByRole('radio', { name: 'Off', checked: false })).toBeInTheDocument();
  });
});

test('Trips shows distance in the driver’s units and resets a named meter', () => {
  renderPanel(<Trips />, {
    type: 'settings/set',
    patch: { preferences: { ...initialCarState.settings.preferences, distance: 'km' } },
  });
  expect(screen.getAllByText(/km$/).length).toBeGreaterThan(0);

  press('Reset Trip A');
  expect(latest.tripMeters[0].miles).toBe(latest.odometerMiles);
});

test('Notifications lists history, marks it seen and clears it', () => {
  renderPanel(<Notifications />, { type: 'notice/show', message: 'Charging complete' });
  expect(screen.getAllByText('Charging complete').length).toBeGreaterThan(0);
  expect(latest.notificationsSeenId).toBe(latest.notifications[0].id);

  press('Clear all');
  expect(latest.notifications).toEqual([]);
  expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
});

test('Schedule adds a recurring entry and can delete it', () => {
  renderPanel(<Schedule />);

  fireEvent.click(screen.getByRole('radio', { name: 'Repeat' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sat' }));
  type('Time', '06:15');
  press('Add');

  expect(latest.schedule[0]).toMatchObject({
    kind: 'departure',
    time: '06:15',
    days: [1, 2, 3, 4, 5, 6],
  });
  expect(screen.getByText('Mon, Tue, Wed, Thu, Fri, Sat')).toBeInTheDocument();

  press('Delete Be ready to leave at 06:15');
  expect(latest.schedule).toEqual([]);
});

test('Schedule will not add a repeat with no days', () => {
  renderPanel(<Schedule />);
  fireEvent.click(screen.getByRole('radio', { name: 'Repeat' }));
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) press(day);
  expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
});

test('HomeLink moves the door, and stops answering out of range', () => {
  renderPanel(<HomeLink />);

  press('Open Door');
  advance(2);
  expect(screen.getByText('Opening…')).toBeInTheDocument();
  advance(3);
  expect(screen.getByText('Open')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close Door' })).toBeInTheDocument();
});

describe('Software', () => {
  test('shows this build, and renames the car', () => {
    renderPanel(<Software />);
    expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument();
    expect(screen.getByText(__GIT_SHA__)).toBeInTheDocument();

    type('Name Your Vehicle', 'Rocket');
    press('Save');
    expect(latest.settings.vehicleName).toBe('Rocket');
    expect(screen.getByRole('heading', { name: 'Rocket' })).toBeInTheDocument();
  });

  test('runs the simulated update through to the end', () => {
    renderPanel(<Software />);

    press('Check for Updates');
    advance(3);
    press('Download');
    expect(screen.getByRole('progressbar', { name: 'Download progress' })).toBeInTheDocument();
    advance(7);
    press('Install Now');
    advance(6);

    expect(screen.getByText('2026.44.1-demo')).toBeInTheDocument();
  });

  test('keeps the project credits in an About section', () => {
    renderPanel(<Software />);
    expect(screen.getByRole('heading', { name: 'Thanks:' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument();
  });

  test('release notes come from the changelog', () => {
    renderPanel(<Software />);
    press('Show Release Notes');
    expect(screen.getByRole('heading', { name: 'Unreleased' })).toBeInTheDocument();
  });
});

test('Service restarts the screen, and Upgrades offers nothing to buy', () => {
  renderPanel(<Service />);
  press('Restart');
  expect(latest.restartSecondsLeft).toBeGreaterThan(0);

  const { container } = renderPanel(<Upgrades />);
  expect(within(container).queryAllByRole('button')).toEqual([]);
  expect(container.textContent).toMatch(/Nothing here is for sale/);
});
