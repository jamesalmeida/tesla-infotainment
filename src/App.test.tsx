import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// WebGL, the camera feed, and the Google Maps loader are unavailable in jsdom,
// so stub the components that need a real browser environment.
vi.mock('./components/VehicleModel/VehicleModel', () => ({
  VehicleModel: () => null,
}));

vi.mock('./components/Apps/BackupCam/BackupCam', () => ({
  BackupCam: () => null,
}));

// Keep the parts of MapNavigation the app interacts with.
vi.mock('./components/MapNavigation/MapNavigation', () => ({
  MapNavigation: ({ onWifiClick }: { onWifiClick: () => void }) => (
    <div>
      <img alt="Wifi Status" onClick={onWifiClick} />
      <input id="navigateTo" aria-label="Navigate" />
    </div>
  ),
}));

const panel = () => document.querySelector('.vertical-slider-panel');
const panelIsOpen = () => Boolean(panel()?.className.includes('open'));
const navIcon = (name: string) => screen.getByAltText(`${name} icon`);
const gearIcon = (gear: string) => {
  const icon = [...document.querySelectorAll('.gearSelectIcon')].find(
    (el) => el.textContent.trim() === gear,
  );
  if (!icon) throw new Error(`No gear icon for ${gear}`);
  return icon;
};
const activeGear = () => document.querySelector('.gearSelectIcon.active')?.textContent.trim();
const activeSettingsPanel = () =>
  document.querySelector('.left-scroll-panel-item.active')?.textContent.trim();
const cameraIsActive = () =>
  Boolean(document.querySelector('.navIconWrapper.active .navIcons.camera'));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// The loading screen waits for the 3D car, which is stubbed here, so advance to the fallback.
const renderApp = () => {
  render(<App />);
  act(() => {
    vi.advanceTimersByTime(15000);
  });
};

// Slide-up apps are lazy-loaded chunks; let the import resolve before checking their content.
const waitForLazyApp = () => act(() => vi.dynamicImportSettled());

test('renders the infotainment display', () => {
  renderApp();
  expect(document.getElementById('displayBezel')).toBeInTheDocument();
});

test('bottom bar icon opens the slide-up panel and clicking it again closes it', async () => {
  renderApp();

  fireEvent.click(navIcon('bluetooth'));
  await waitForLazyApp();
  expect(panelIsOpen()).toBe(true);
  expect(screen.getByRole('heading', { name: 'Bluetooth' })).toBeInTheDocument();

  fireEvent.click(navIcon('bluetooth'));
  expect(panelIsOpen()).toBe(false);
});

test('map wifi icon opens Settings on Wifi, and reopening returns to Controls', async () => {
  renderApp();

  fireEvent.click(screen.getByAltText('Wifi Status'));
  await waitForLazyApp();
  expect(panelIsOpen()).toBe(true);
  expect(activeSettingsPanel()).toBe('Wifi');

  // Closing Settings through its nav icon clears the jump-to-Wifi request.
  fireEvent.click(screen.getByAltText('car settings icon'));
  expect(panelIsOpen()).toBe(false);

  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  expect(panelIsOpen()).toBe(true);
  expect(activeSettingsPanel()).toBe('Controls');
});

test('reverse gear forces the backup camera and blocks closing until Park', () => {
  renderApp();

  fireEvent.click(gearIcon('R'));
  expect(panelIsOpen()).toBe(true);
  expect(cameraIsActive()).toBe(true);

  // Other apps are inert while the camera is forced.
  fireEvent.click(navIcon('bluetooth'));
  expect(panelIsOpen()).toBe(true);
  expect(cameraIsActive()).toBe(true);

  fireEvent.click(gearIcon('P'));
  expect(panelIsOpen()).toBe(false);
});

test('Shift+C toggles the backup camera', () => {
  renderApp();

  fireEvent.keyDown(document.body, { key: 'C', shiftKey: true });
  expect(panelIsOpen()).toBe(true);
  expect(cameraIsActive()).toBe(true);

  fireEvent.keyDown(document.body, { key: 'C', shiftKey: true });
  expect(panelIsOpen()).toBe(false);
});

test('letter shortcuts select gears', () => {
  renderApp();

  fireEvent.keyDown(document.body, { key: 'r' });
  expect(activeGear()).toBe('R');
  expect(panelIsOpen()).toBe(true);

  fireEvent.keyDown(document.body, { key: 'p' });
  expect(activeGear()).toBe('P');
  expect(panelIsOpen()).toBe(false);

  fireEvent.keyDown(document.body, { key: 'n' });
  expect(activeGear()).toBe('N');

  fireEvent.keyDown(document.body, { key: 'd' });
  expect(activeGear()).toBe('D');
});

test('Shift+Arrow and Shift+H control the turn signals', () => {
  renderApp();

  fireEvent.keyDown(document.body, { key: 'ArrowLeft', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(1);

  fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(1);

  fireEvent.keyDown(document.body, { key: 'H', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(2);

  // Hazards off brings the right signal back rather than losing it.
  fireEvent.keyDown(document.body, { key: 'H', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(1);

  fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(0);
});

test('the shelf closes from the backdrop and Escape, and the dock icon stays in sync', () => {
  renderApp();
  const shelfIsOpen = () => Boolean(screen.queryByRole('dialog'));

  fireEvent.click(screen.getByAltText('Open Menu'));
  expect(shelfIsOpen()).toBe(true);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(shelfIsOpen()).toBe(false);
  expect(screen.getByAltText('Open Menu')).toBeInTheDocument();

  fireEvent.click(screen.getByAltText('Open Menu'));
  const overlay = screen.getByRole('dialog').parentElement;
  if (!overlay) throw new Error('Modal has no overlay');
  fireEvent.click(overlay);
  expect(shelfIsOpen()).toBe(false);
});

test('the shelf launches apps', async () => {
  renderApp();

  fireEvent.click(screen.getByAltText('Open Menu'));
  fireEvent.click(screen.getByAltText('Calendar icon'));
  await waitForLazyApp();

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(panelIsOpen()).toBe(true);
  expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
});

test('? opens the shortcut list', () => {
  renderApp();

  fireEvent.keyDown(document.body, { key: '?', shiftKey: true });

  expect(screen.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
});

test('Settings survive leaving the panel and closing the app', async () => {
  renderApp();

  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  fireEvent.click(screen.getByText('Sentry'));
  expect(screen.getByText('Sentry').className).toContain('active');

  fireEvent.click(screen.getByText('Dynamics'));
  await waitForLazyApp();
  fireEvent.click(screen.getByText('Controls'));
  expect(screen.getByText('Sentry').className).toContain('active');

  fireEvent.click(screen.getByAltText('car settings icon'));
  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  expect(screen.getByText('Sentry').className).toContain('active');
});

test('brightness survives closing Settings, and Auto restores the manual value', async () => {
  renderApp();
  const overlay = () => document.querySelector<HTMLElement>('.brightnessOverlay');

  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '40' } });
  expect(overlay()?.style.opacity).toBe('0.6');

  fireEvent.click(screen.getByAltText('car settings icon'));
  expect(overlay()?.style.opacity).toBe('0.6');

  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  expect(screen.getByLabelText('Brightness')).toHaveValue('40');

  const auto = document.querySelector('.brightness-auto-btn');
  if (!auto) throw new Error('Auto brightness button did not render');
  fireEvent.click(auto);
  expect(overlay()?.style.opacity).toBe('0');

  fireEvent.click(auto);
  expect(overlay()?.style.opacity).toBe('0.6');
  expect(screen.getByLabelText('Brightness')).toHaveValue('40');
});

test('Shift+M focuses the navigate input', () => {
  renderApp();

  const input = document.getElementById('navigateTo');
  fireEvent.keyDown(document.body, { key: 'M', shiftKey: true });
  expect(document.activeElement).toBe(input);
});

describe('modes outlive Settings', () => {
  const openControls = async () => {
    renderApp();
    fireEvent.click(screen.getByAltText('car settings icon'));
    await waitForLazyApp();
  };
  const carWash = () => screen.queryByRole('dialog', { name: 'Car Wash Mode' });

  test('Car Wash covers the display, stays through closing Settings, and restores on exit', async () => {
    await openControls();
    fireEvent.click(screen.getByText('Sentry'));
    fireEvent.click(screen.getByText('Car Wash'));
    expect(carWash()).toBeInTheDocument();
    expect(screen.getByText('Sentry off')).toBeInTheDocument();

    fireEvent.click(screen.getByAltText('car settings icon'));
    expect(carWash()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Exit Car Wash Mode' }));
    expect(carWash()).toBeNull();

    fireEvent.click(screen.getByAltText('car settings icon'));
    await waitForLazyApp();
    expect(screen.getByText('Sentry').className).toContain('active');
  });

  test('Free Roll shows Neutral, and shifting to Drive ends the mode', async () => {
    await openControls();
    fireEvent.click(screen.getByText('Car Wash'));
    fireEvent.click(screen.getByRole('button', { name: 'Free Roll' }));
    expect(activeGear()).toBe('N');
    expect(screen.getByRole('button', { name: 'Free Roll' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(gearIcon('D'));
    expect(carWash()).toBeNull();
  });

  test('Car Wash is refused in Drive, with the reason on screen', async () => {
    await openControls();
    fireEvent.click(gearIcon('D'));
    fireEvent.click(screen.getByText('Car Wash'));
    expect(carWash()).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Shift to Park to use Car Wash Mode');
  });

  test('a Sentry alarm frames the display until it is dismissed', async () => {
    await openControls();
    fireEvent.click(screen.getByText('Sentry'));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate a Break-In' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Sentry Mode alarm');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

test('units reach the battery display and are saved', async () => {
  renderApp();
  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  fireEvent.click(screen.getByText('Display'));
  await waitForLazyApp();
  fireEvent.click(screen.getByRole('radio', { name: 'Kilometers' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Distance' }));

  expect(screen.getByRole('button', { name: /^Battery/ })).toHaveTextContent('344 km');
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  const saved = JSON.parse(localStorage.getItem('tesla-car-state') ?? '{}');
  expect(saved.state.settings.preferences).toMatchObject({
    distance: 'km',
    energyDisplay: 'distance',
  });
});

test('the charge status sits with the car while a cable is in', async () => {
  renderApp();
  fireEvent.click(screen.getByAltText('car settings icon'));
  await waitForLazyApp();
  fireEvent.click(screen.getByText('Charging'));
  await waitForLazyApp();
  fireEvent.click(screen.getByRole('button', { name: 'Plug In Cable' }));

  const status = document.querySelector('.chargeStatus');
  expect(status).toHaveTextContent(/Charging/);
  expect(status).toHaveTextContent(/remaining/);

  fireEvent.click(screen.getByRole('button', { name: 'Unlock and Unplug' }));
  expect(document.querySelector('.chargeStatus')).toBeNull();
});
