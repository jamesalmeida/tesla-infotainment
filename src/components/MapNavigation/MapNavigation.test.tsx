import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { installFakeMaps, type FakeMaps } from './fakeGoogleMaps';
import { MapNavigation } from './MapNavigation';

vi.mock('@vis.gl/react-google-maps', async () => (await import('./fakeGoogleMaps')).visGlMock);

// The top bar needs app-level providers and has nothing to do with these flows.
vi.mock('../CarLock/CarLock', () => ({ default: () => null }));
vi.mock('../Clock/Clock', () => ({ default: () => null }));
vi.mock('../OutsideTemp/OutsideTemp', () => ({ default: () => null }));
vi.mock('../UserProfile/UserProfile', () => ({ default: () => null }));

const HOME = { lat: 1, lng: 1 };
const WORK = { lat: 2, lng: 2 };
const GYM = { lat: 3, lng: 3 };

let fake: FakeMaps;

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

const settle = async (fn: () => void) => {
  fn();
  await flush();
};

const renderMap = () => render(<MapNavigation onWifiClick={() => {}} />);
const searchBox = () => screen.getByRole<HTMLInputElement>('combobox');
const navigateButton = () => screen.queryByRole('button', { name: 'Navigate' });
const endButton = () => screen.queryByRole('button', { name: 'End Navigation' });
const routeLine = () => screen.queryByTestId('route-line');
const routePath = () => JSON.parse(routeLine()?.getAttribute('data-path') ?? 'null');
const markers = () =>
  screen.getAllByTestId('marker').map((m) => JSON.parse(m.getAttribute('data-position') ?? 'null'));

/** Types a search and picks its only result, end to end through the fake. */
async function choosePlace(name: string, location: google.maps.LatLngLiteral) {
  fireEvent.change(searchBox(), { target: { value: name } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
  const search = fake.autocompleteCalls.at(-1);
  if (!search) throw new Error('No suggestion request was made');
  await settle(() => search.resolve({ suggestions: [fake.suggestion(name, { location })] }));
  fireEvent.mouseDown(screen.getByRole('option', { name }));
  await flush();
  const lookup = fake.detailCalls.at(-1);
  if (!lookup) throw new Error('No place details request was made');
  await settle(() => lookup.resolve(undefined));
}

async function pressNavigate() {
  const button = navigateButton();
  if (!button) throw new Error('Navigate is not showing');
  fireEvent.click(button);
  await flush();
}

const lastRouteCall = () => {
  const call = fake.routeCalls.at(-1);
  if (!call) throw new Error('No route request was made');
  return call;
};

async function startTrip(name: string, location: google.maps.LatLngLiteral) {
  await choosePlace(name, location);
  await pressNavigate();
  await settle(() => lastRouteCall().resolve(fake.route([location])));
}

beforeEach(() => {
  vi.useFakeTimers();
  fake = installFakeMaps();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('navigation flow (#49)', () => {
  test('choosing a place offers Navigate and marks it', async () => {
    renderMap();
    await choosePlace('Home', HOME);

    expect(searchBox()).toHaveValue('Home');
    expect(navigateButton()).toBeInTheDocument();
    expect(markers()).toContainEqual(HOME);
    expect(fake.map.panTo).toHaveBeenCalledWith(HOME);
  });

  test('routing shows progress, then navigation starts', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();

    expect(screen.getByText('Routing to Home…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Routing…' })).toBeDisabled();
    expect(routeLine()).not.toBeInTheDocument();

    await settle(() => lastRouteCall().resolve(fake.route([HOME])));

    expect(screen.getByText('Navigating to Home')).toBeInTheDocument();
    expect(routePath()).toEqual([HOME]);
    expect(endButton()).toBeInTheDocument();
    expect(navigateButton()).not.toBeInTheDocument();
    expect(fake.map.fitBounds).toHaveBeenCalledExactlyOnceWith({ fake: 'bounds' });
  });

  test('routes from the car to the place', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();

    expect(lastRouteCall().request).toMatchObject({
      destination: HOME,
      travelMode: 'DRIVING',
    });
  });

  test('clear during navigation keeps the route and the way to end it', async () => {
    renderMap();
    await startTrip('Home', HOME);

    fireEvent.click(screen.getByAltText('Clear input'));
    await flush();

    expect(searchBox()).toHaveValue('');
    expect(routePath()).toEqual([HOME]);
    expect(screen.getByText('Navigating to Home')).toBeInTheDocument();
    expect(endButton()).toBeInTheDocument();
  });

  test('a new search during navigation leaves the route until Navigate is pressed', async () => {
    renderMap();
    await startTrip('Home', HOME);

    await choosePlace('Work', WORK);

    // The box shows the candidate, and the screen says where the car is actually going.
    expect(searchBox()).toHaveValue('Work');
    expect(routePath()).toEqual([HOME]);
    expect(screen.getByText('Navigating to Home')).toBeInTheDocument();
    expect(markers()).toContainEqual(WORK);
    expect(navigateButton()).toBeInTheDocument();
    expect(endButton()).toBeInTheDocument();
    expect(fake.routeCalls).toHaveLength(1);

    await pressNavigate();
    expect(fake.routeCalls).toHaveLength(2);
    expect(lastRouteCall().request.destination).toEqual(WORK);
    expect(routePath()).toEqual([HOME]);

    await settle(() => lastRouteCall().resolve(fake.route([WORK])));
    expect(routePath()).toEqual([WORK]);
    expect(screen.getByText('Navigating to Work')).toBeInTheDocument();
    expect(navigateButton()).not.toBeInTheDocument();
  });

  test('a failed reroute keeps the trip that was running', async () => {
    renderMap();
    await startTrip('Home', HOME);
    await choosePlace('Work', WORK);
    await pressNavigate();

    await settle(() => lastRouteCall().reject(new Error('boom')));

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't get directions to Work. Still navigating to Home.",
    );
    expect(routePath()).toEqual([HOME]);
    expect(endButton()).toBeInTheDocument();
  });

  test('double-clicking Navigate sends one request', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    const button = navigateButton();
    if (!button) throw new Error('Navigate is not showing');

    fireEvent.click(button);
    fireEvent.click(button);
    await flush();

    expect(fake.routeCalls).toHaveLength(1);
  });

  test('clear while routing drops the response', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();

    fireEvent.click(screen.getByAltText('Clear input'));
    await flush();
    await settle(() => lastRouteCall().resolve(fake.route([HOME])));

    expect(routeLine()).not.toBeInTheDocument();
    expect(endButton()).not.toBeInTheDocument();
    expect(navigateButton()).not.toBeInTheDocument();
    expect(fake.map.fitBounds).not.toHaveBeenCalled();
  });

  test('a response to an abandoned request cannot replace a newer one', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();
    const abandoned = lastRouteCall();

    await choosePlace('Gym', GYM);
    await pressNavigate();
    const newest = lastRouteCall();

    await settle(() => newest.resolve(fake.route([GYM])));
    await settle(() => abandoned.resolve(fake.route([HOME])));

    expect(routePath()).toEqual([GYM]);
    expect(screen.getByText('Navigating to Gym')).toBeInTheDocument();
  });

  test('a failed route request shows a message and can be retried', async () => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();

    await settle(() => lastRouteCall().reject(new Error('boom')));

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't get directions to Home.");
    expect(routeLine()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await flush();
    expect(fake.routeCalls).toHaveLength(2);
    await settle(() => lastRouteCall().resolve(fake.route([HOME])));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(routePath()).toEqual([HOME]);
  });

  test.each([
    ['no routes', { routes: [] }],
    ['an undefined route list', { routes: undefined }],
    ['a route with no path', { routes: [{}] as unknown as google.maps.routes.Route[] }],
  ])('%s is reported as no route', async (_name, response) => {
    renderMap();
    await choosePlace('Home', HOME);
    await pressNavigate();

    await settle(() => lastRouteCall().resolve(response));

    expect(screen.getByRole('alert')).toHaveTextContent('No route found to Home.');
  });

  test('End Navigation clears the trip and the search', async () => {
    renderMap();
    await startTrip('Home', HOME);

    fireEvent.click(endButton() as HTMLElement);
    await flush();

    expect(routeLine()).not.toBeInTheDocument();
    expect(searchBox()).toHaveValue('');
    expect(endButton()).not.toBeInTheDocument();
  });

  test('a route that lands after End Navigation is dropped', async () => {
    renderMap();
    await startTrip('Home', HOME);
    await choosePlace('Work', WORK);
    await pressNavigate();

    fireEvent.click(endButton() as HTMLElement);
    await flush();
    await settle(() => lastRouteCall().resolve(fake.route([WORK])));

    expect(routeLine()).not.toBeInTheDocument();
    expect(endButton()).not.toBeInTheDocument();
  });
});
