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
  MapNavigation: ({ onWifiClick }) => (
    <div>
      <img alt="Wifi Status" onClick={onWifiClick} />
      <input id="navigateTo" aria-label="Navigate" />
    </div>
  ),
}));

const panel = () => document.querySelector('.vertical-slider-panel');
const panelIsOpen = () => Boolean(panel()?.className.includes('open'));
const navIcon = (name) => screen.getByAltText(`${name} icon`);
const gearIcon = (gear) =>
  [...document.querySelectorAll('.gearSelectIcon')].find((el) => el.textContent.trim() === gear);
const activeGear = () => document.querySelector('.gearSelectIcon.active')?.textContent.trim();
const activeSettingsPanel = () =>
  document.querySelector('.left-scroll-panel-item.active')?.textContent.trim();
const cameraIsActive = () =>
  Boolean(document.querySelector('.navIconWrapper.active .navIcons.camera'));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// The app hides its content behind the loading screen until images report as
// loaded (which never happens in jsdom), so advance to the fallback timer.
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
  expect(screen.getByText('Bluetooth')).toBeInTheDocument();

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

  fireEvent.keyDown(document.body, { key: 'H', shiftKey: true });
  expect(document.querySelectorAll('.turnSignal.active')).toHaveLength(0);
});

test('Shift+M focuses the navigate input', () => {
  renderApp();

  const input = document.getElementById('navigateTo');
  fireEvent.keyDown(document.body, { key: 'M', shiftKey: true });
  expect(document.activeElement).toBe(input);
});
