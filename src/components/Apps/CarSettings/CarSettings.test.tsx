import { useLayoutEffect } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../../state/CarStateContext';
import {
  initialCarState,
  type CarState,
  type SettingsPanel,
  type VehicleSettings,
} from '../../../state/carState';
import { CarSettings } from './CarSettings';
import { searchSettings, SETTINGS_INDEX } from './settingsIndex';

let current: CarState;

function Probe() {
  const state = useCar((value) => value);
  useLayoutEffect(() => {
    current = state;
  });
  return null;
}

const stateOn = (panel: SettingsPanel, patch: Partial<CarState> = {}): CarState => ({
  ...initialCarState,
  surface: { kind: 'settings', panel },
  ...patch,
});

const renderSettings = (state: CarState) =>
  render(
    <CarStateProvider initialState={state}>
      <Probe />
      <CarSettings />
    </CarStateProvider>,
  );

const renderPanel = (panel: SettingsPanel, patch?: Partial<CarState>) =>
  renderSettings(stateOn(panel, patch));

const inSettings = (patch: Partial<VehicleSettings>) => ({
  settings: { ...initialCarState.settings, ...patch },
});

const openPanel = (panel: string) =>
  fireEvent.click(
    within(document.querySelector('.left-scroll-panel') as HTMLElement).getByText(panel),
  );

const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
const flip = (name: string) => fireEvent.click(screen.getByRole('switch', { name }));
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const slide = (name: string, value: number) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value: String(value) } });

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('each control reaches the store and outlives its panel', () => {
  test.each<[SettingsPanel, string, () => void, (state: CarState) => unknown, unknown]>([
    ['Dynamics', 'acceleration', () => pick('Chill'), (s) => s.settings.acceleration, 'chill'],
    ['Dynamics', 'steering', () => pick('Comfort'), (s) => s.settings.steeringMode, 'comfort'],
    ['Dynamics', 'stopping', () => pick('Creep'), (s) => s.settings.stoppingMode, 'creep'],
    ['Dynamics', 'regen', () => pick('Low'), (s) => s.settings.regenBraking, 'low'],
    ['Dynamics', 'track mode', () => flip('Track Mode'), (s) => s.settings.trackMode, true],
    ['Dynamics', 'slip start', () => flip('Slip Start'), (s) => s.settings.slipStart, true],
    ['Charging', 'limit', () => slide('Charge Limit', 90), (s) => s.settings.chargeLimit, 90],
    ['Charging', 'current', () => slide('Charge Current', 16), (s) => s.settings.chargeCurrent, 16],
    [
      'Charging',
      'schedule',
      () => flip('Scheduled Charging'),
      (s) => s.settings.scheduledCharging,
      true,
    ],
    ['Autopilot', 'cruise', () => flip('Autosteer'), (s) => s.settings.autosteer, false],
    [
      'Autopilot',
      'following distance',
      () => slide('Following Distance', 5),
      (s) => s.settings.followingDistance,
      5,
    ],
    ['Autopilot', 'offset', () => slide('Speed Offset', -5), (s) => s.settings.speedOffset, -5],
    ['Autopilot', 'profile', () => pick('Mad Max'), (s) => s.settings.drivingProfile, 'mad-max'],
    [
      'Locks',
      'walk-away',
      () => flip('Walk-Away Door Lock'),
      (s) => s.settings.walkAwayLock,
      false,
    ],
    [
      'Locks',
      'unlock on park',
      () => flip('Unlock on Park'),
      (s) => s.settings.unlockOnPark,
      false,
    ],
    ['Locks', 'drive-away', () => flip('Drive-Away Lock'), (s) => s.settings.driveAwayLock, false],
    ['Locks', 'chime', () => flip('Lock Confirmation Sound'), (s) => s.settings.lockSound, false],
    ['Locks', 'child lock', () => pick('Both'), (s) => s.settings.childLock, 'both'],
    ['Lights', 'headlights', () => pick('Parking'), (s) => s.settings.headlights, 'parking'],
    ['Lights', 'high beams', () => flip('High Beams'), (s) => s.settings.highBeams, true],
    ['Lights', 'fog', () => flip('Fog Lights'), (s) => s.settings.fogLights, true],
    ['Lights', 'auto high', () => flip('Auto High Beam'), (s) => s.settings.autoHighBeam, true],
    [
      'Lights',
      'adaptive',
      () => flip('Adaptive Headlights'),
      (s) => s.settings.adaptiveHeadlights,
      false,
    ],
    [
      'Lights',
      'after exit',
      () => flip('Headlights After Exit'),
      (s) => s.settings.headlightsAfterExit,
      false,
    ],
    ['Lights', 'ambient', () => flip('Ambient Lights'), (s) => s.settings.ambientLights, false],
    ['Display', 'appearance', () => pick('Dark'), (s) => s.display.appearance, 'dark'],
    ['Display', 'brightness', () => slide('Brightness', 40), (s) => s.display.brightness, 40],
    [
      'Display',
      'blue light',
      () => slide('Blue Light Reduction', 60),
      (s) => s.display.blueLightReduction,
      60,
    ],
    ['Display', 'distance', () => pick('Kilometers'), (s) => s.settings.preferences.distance, 'km'],
    ['Display', 'temperature', () => pick('°C'), (s) => s.settings.preferences.temperature, 'C'],
    ['Display', 'pressure', () => pick('Bar'), (s) => s.settings.preferences.tirePressure, 'bar'],
    ['Display', 'time', () => pick('24-hour'), (s) => s.settings.preferences.timeFormat, '24h'],
    [
      'Display',
      'energy',
      () => pick('Distance'),
      (s) => s.settings.preferences.energyDisplay,
      'distance',
    ],
    ['Display', 'pet mode', () => pick('Camp'), (s) => s.settings.petMode, 'camp'],
  ])('%s: %s', (panel, _, change, read, expected) => {
    renderPanel(panel);
    change();
    expect(read(current)).toEqual(expected);

    openPanel(panel === 'Controls' ? 'Dynamics' : 'Controls');
    openPanel(panel);
    expect(read(current)).toEqual(expected);
  });

  test('what Lights changes, Quick Controls shows, and the other way round', () => {
    renderPanel('Lights');
    pick('Parking');
    openPanel('Controls');
    expect(screen.getByRole('button', { name: 'Parking' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'On' }));
    openPanel('Lights');
    const headlights = document.querySelector<HTMLElement>('[data-setting="lights-headlights"]');
    expect(within(headlights as HTMLElement).getByRole('radio', { name: 'On' })).toBeChecked();
  });

  test('Display and Quick Controls share one brightness', () => {
    renderPanel('Controls');
    slide('Brightness', 30);
    openPanel('Display');
    expect(screen.getByLabelText('Brightness')).toHaveValue('30');
  });
});

describe('rules show in the panels', () => {
  const inDrive = { gear: 'D' } as const;

  test('Track Mode only turns on in Park', () => {
    renderPanel('Dynamics', inDrive);
    flip('Track Mode');
    expect(current.settings.trackMode).toBe(false);
    expect(screen.getByRole('switch', { name: 'Track Mode' })).not.toBeChecked();
    expect(current.notice?.message).toBe('Shift to Park to turn on Track Mode');
  });

  test('the last key stays', () => {
    const keys = [initialCarState.settings.keys[0]];
    renderPanel('Locks', inSettings({ keys }));
    press('Remove');
    expect(current.settings.keys).toEqual(keys);
    expect(current.notice?.message).toBe('The car needs at least one key');
  });

  test('keys can be added and removed', () => {
    renderPanel('Locks');
    press('Key fob');
    expect(current.settings.keys.at(-1)).toMatchObject({ id: 4, kind: 'fob', name: 'Key fob 2' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(current.settings.keys.map((key) => key.id)).toEqual([2, 3, 4]);
  });

  test('walking away locks the car', () => {
    renderPanel('Locks', { isLocked: false });
    press('Walk Away');
    expect(current.isLocked).toBe(true);
    expect(screen.getByText('Car is locked')).toBeInTheDocument();
  });

  test('Autopilot refuses out of Drive and engages in it', () => {
    renderPanel('Autopilot');
    press('Engage Autosteer');
    expect(current.autopilot).toBe('off');
    expect(current.notice?.message).toBe('Shift to Drive to engage');
  });

  test('Autopilot engages and disengages in Drive', () => {
    renderPanel('Autopilot', inDrive);
    press('Engage Autosteer');
    expect(current.autopilot).toBe('autosteer');
    press('Disengage');
    expect(current.autopilot).toBe('off');
  });

  test('Autopilot says plainly that none of it is real', () => {
    renderPanel('Autopilot');
    expect(screen.getByText(/Nothing on this screen reflects/)).toBeInTheDocument();
  });

  test('Screen Clean and Car Wash are refused out of Park', () => {
    renderPanel('Display', inDrive);
    press('Clean Screen');
    expect(current.overlayMode).toBe(null);
    expect(current.notice?.message).toBe('Shift to Park to clean the screen');
  });
});

describe('charging', () => {
  test('plug in, stop, restart and unplug', () => {
    renderPanel('Charging');
    press('Plug In Cable');
    expect(current.chargeState).toBe('charging');
    expect(screen.getByText(/Charging ·/)).toBeInTheDocument();

    press('Stop Charging');
    expect(current.chargeState).toBe('stopped');
    press('Start Now');
    expect(current.chargeState).toBe('charging');

    press('Unlock and Unplug');
    expect(current.chargeState).toBe('unplugged');
    expect(current.chargePortOpen).toBe(false);
  });

  test('the port can be opened and closed, but not with the cable in', () => {
    renderPanel('Charging');
    press('Open Port');
    expect(current.chargePortOpen).toBe(true);
    press('Close Port');
    expect(current.chargePortOpen).toBe(false);
    press('Plug In Cable');
    expect(screen.queryByRole('button', { name: /Port/ })).toBeNull();
  });

  test('session stats follow the units', () => {
    const session = { percentAdded: 10, hours: 0.5 };
    const preferences = { ...initialCarState.settings.preferences, distance: 'km' as const };
    renderPanel('Charging', {
      chargeSession: session,
      ...inSettings({ preferences }),
    });
    expect(screen.getByText('7.5 kWh')).toBeInTheDocument();
    expect(screen.getByText('50 km')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  test('the schedule time is saved and read back', () => {
    renderPanel('Charging', inSettings({ scheduledCharging: true }));
    fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '06:30' } });
    expect(current.settings.scheduledChargeTime).toBe('06:30');
  });
});

describe('Quick Controls', () => {
  test('the glovebox shows that it is open', () => {
    renderPanel('Controls');
    press('Glovebox');
    expect(current.gloveboxOpen).toBe(true);
    expect(screen.getByRole('button', { name: /Glovebox/ })).toHaveTextContent('Open');

    openPanel('Dynamics');
    openPanel('Controls');
    expect(screen.getByRole('button', { name: /Glovebox/ })).toHaveTextContent('Open');
  });

  test('Fold Mirrors is state the car can read', () => {
    renderPanel('Controls');
    press('Fold Mirrors');
    expect(current.settings.foldMirrors).toBe(true);
  });

  test('mirrors adjust by button, key and wheel, and each side remembers', () => {
    renderPanel('Controls', inSettings({ foldMirrors: true }));
    press('Mirrors');
    expect(current.settings.foldMirrors).toBe(false);

    const pad = screen.getByRole('dialog', { name: 'Adjust Mirrors' });
    press('Up');
    fireEvent.keyDown(pad, { key: 'ArrowRight' });
    fireEvent.wheel(pad, { deltaY: -80 });
    expect(current.settings.mirrorLeft).toEqual({ x: 1, y: 3 });

    press('Right Mirror');
    press('Down');
    expect(current.settings.mirrorRight).toEqual({ x: 0, y: -1 });
    expect(current.settings.mirrorLeft).toEqual({ x: 1, y: 3 });

    press('Done');
    expect(screen.queryByRole('dialog', { name: 'Adjust Mirrors' })).toBeNull();
  });

  test('a small trackpad scroll has to add up before it moves anything', () => {
    renderPanel('Controls');
    press('Mirrors');
    const pad = screen.getByRole('dialog', { name: 'Adjust Mirrors' });
    fireEvent.wheel(pad, { deltaY: 10 });
    expect(current.settings.mirrorLeft.y).toBe(0);
    fireEvent.wheel(pad, { deltaY: 30 });
    expect(current.settings.mirrorLeft.y).toBe(-1);
  });

  test('adjustment stops at the end of travel', () => {
    renderPanel('Controls', inSettings({ mirrorLeft: { x: 10, y: 0 } }));
    press('Mirrors');
    press('Right');
    expect(current.settings.mirrorLeft.x).toBe(10);
  });

  test('Escape leaves adjustment mode', () => {
    renderPanel('Controls');
    press('Steering');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('the steering wheel only adjusts in Park', () => {
    renderPanel('Controls', { gear: 'D' });
    press('Steering');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(current.notice?.message).toBe('Shift to Park to adjust the steering wheel');
  });

  test('the steering wheel saves its position', () => {
    renderPanel('Controls');
    press('Steering');
    press('Left');
    expect(current.settings.steeringWheel).toEqual({ x: -1, y: 0 });
  });

  test('Car Wash starts the mode in the store', () => {
    renderPanel('Controls');
    press('Car Wash');
    expect(current.overlayMode).toBe('car-wash');
  });

  test('Sentry and the dashcam report their state', () => {
    renderPanel('Controls');
    press('Sentry');
    press('Dashcam');
    expect(screen.getByText('Standby: watching the car')).toBeInTheDocument();
    expect(screen.getByText('Recording')).toBeInTheDocument();

    press('Simulate a Break-In');
    expect(current.sentryAlarm).toBe(true);
    expect(screen.getByText('1 saved clip')).toBeInTheDocument();
  });

  test('dashcam modes are selectable, and On Honk saves from the horn', () => {
    renderPanel('Controls', inSettings({ dashcam: true }));
    pick('On Honk');
    expect(current.settings.dashcamMode).toBe('honk');
    press('Sound Horn');
    expect(current.dashcamClips[0]?.source).toBe('honk');
  });
});

describe('search', () => {
  const searchFor = (text: string) =>
    fireEvent.change(screen.getByRole('combobox', { name: 'Search settings' }), {
      target: { value: text },
    });

  test.each([
    ['track', 'Track Mode'],
    ['TRACK', 'Track Mode'],
    ['dark mode', 'Appearance'],
    ['creep', 'Stopping Mode'],
    ['chirp', 'Lock Confirmation Sound'],
    ['24 hour', 'Time Format'],
    ['amps', 'Charge Current'],
    ['network', 'Wifi'],
  ])('%s finds %s', (query, label) => {
    expect(searchSettings(query).map((entry) => entry.label)).toContain(label);
  });

  test('an empty search finds nothing, and a label start beats a match inside', () => {
    expect(searchSettings('  ')).toEqual([]);
    expect(searchSettings('lock')[0].label).toBe('Lock Confirmation Sound');
  });

  test('every id is unique', () => {
    const ids = SETTINGS_INDEX.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each([
    'Controls',
    'Dynamics',
    'Charging',
    'Autopilot',
    'Locks',
    'Lights',
    'Display',
  ] as const)('every %s entry points at something on the panel', (panel) => {
    renderPanel(panel, { chargeSession: { percentAdded: 1, hours: 1 } });
    for (const entry of SETTINGS_INDEX.filter((candidate) => candidate.panel === panel)) {
      expect(
        document.querySelector(`[data-setting="${entry.id}"]`),
        `${entry.id} is not on ${panel}`,
      ).not.toBeNull();
    }
  });

  test('picking a result opens the panel and marks the row', () => {
    vi.useFakeTimers();
    renderPanel('Controls');
    searchFor('fog');
    fireEvent.click(screen.getByRole('option', { name: /Fog Lights/ }));

    expect(current.surface).toEqual({ kind: 'settings', panel: 'Lights' });
    const row = document.querySelector('[data-setting="fog-lights"]');
    expect(row).toHaveAttribute('data-highlighted');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(row).not.toHaveAttribute('data-highlighted');
  });

  test('Enter takes the highlighted result, and the arrows move it', () => {
    renderPanel('Controls');
    searchFor('head');
    const input = screen.getByRole('combobox', { name: 'Search settings' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(current.surface).toEqual({ kind: 'settings', panel: 'Lights' });
    expect(input).toHaveValue('');
  });

  test('a search with no match says so', () => {
    renderPanel('Controls');
    searchFor('zzzz');
    expect(screen.getByText('No matching settings')).toBeInTheDocument();
  });

  test('Escape closes the results', () => {
    renderPanel('Controls');
    searchFor('fog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('option')).toBeNull();
  });
});

describe('narrow panels', () => {
  const view = () => document.querySelector('.car-settings-panel')?.getAttribute('data-view');

  test('Settings opens on the list, drills into a panel, and comes back', () => {
    renderPanel('Controls');
    expect(view()).toBe('list');
    openPanel('Lights');
    expect(view()).toBe('detail');
    fireEvent.click(document.querySelector('.back-button') as HTMLElement);
    expect(view()).toBe('list');
    expect(current.surface).toEqual({ kind: 'settings', panel: 'Lights' });
  });

  test('picking the panel already showing still drills in', () => {
    renderPanel('Controls');
    openPanel('Controls');
    expect(view()).toBe('detail');
  });

  test('a jump from elsewhere lands on the panel', () => {
    renderPanel('Wifi');
    expect(view()).toBe('detail');
  });

  test('a search result lands on the panel', () => {
    renderPanel('Controls');
    fireEvent.change(screen.getByRole('combobox', { name: 'Search settings' }), {
      target: { value: 'wipers' },
    });
    fireEvent.click(screen.getByRole('option', { name: /Wipers/ }));
    expect(view()).toBe('detail');
  });
});

test.each(['Dynamics', 'Charging', 'Autopilot', 'Locks', 'Lights', 'Display'] as const)(
  '%s has no placeholder text',
  (panel) => {
    renderPanel(panel);
    const text = document.querySelector('.settings-right-panel')?.textContent ?? '';
    expect(text).not.toMatch(/lorem|ipsum|On\/Off Toggle|^Button$/i);
  },
);
