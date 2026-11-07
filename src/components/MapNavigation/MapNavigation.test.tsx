import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCarActions } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
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

const renderMap = (onWifiClick = () => {}) =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <MapNavigation onWifiClick={onWifiClick} />
    </CarStateProvider>,
  );
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
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
  fake = installFakeMaps();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, 'geolocation');
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

describe('map layers (#50)', () => {
  const button = (name: string) => screen.getByRole('button', { name });
  const satellite = () => button('Satellite map');
  const traffic = () => button('Traffic');
  const chargers = () => button('Charging locations');
  const locate = () => button('Locate car');
  const mapType = () => screen.getByTestId('map').getAttribute('data-map-type');
  const liveTrafficLayers = () =>
    fake.trafficLayers.filter((layer) => layer.setMap.mock.lastCall?.[0] === fake.map);

  function stubGeolocation() {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    return {
      getCurrentPosition,
      succeed(index: number, lat: number, lng: number) {
        const onSuccess = getCurrentPosition.mock.calls[index][0];
        return settle(() =>
          onSuccess({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition),
        );
      },
      fail(index: number, code: number) {
        const onError = getCurrentPosition.mock.calls[index][1];
        return settle(() => onError?.({ code } as GeolocationPositionError));
      },
    };
  }

  describe('traffic', () => {
    test('the button shows its state and the layer follows it', async () => {
      renderMap();
      expect(traffic()).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(traffic());
      await flush();
      expect(traffic()).toHaveAttribute('aria-pressed', 'true');
      expect(traffic()).toHaveClass('layerOn');
      expect(liveTrafficLayers()).toHaveLength(1);

      fireEvent.click(traffic());
      await flush();
      expect(traffic()).toHaveAttribute('aria-pressed', 'false');
      expect(traffic()).not.toHaveClass('layerOn');
      expect(liveTrafficLayers()).toHaveLength(0);
    });

    test('turning traffic on from satellite goes back to the road map', async () => {
      renderMap();
      fireEvent.click(satellite());
      fireEvent.click(traffic());
      await flush();

      expect(mapType()).toBe('roadmap');
      expect(satellite()).toHaveAttribute('aria-pressed', 'false');
      expect(liveTrafficLayers()).toHaveLength(1);
    });

    test('switching to satellite turns traffic off', async () => {
      renderMap();
      fireEvent.click(traffic());
      fireEvent.click(satellite());
      await flush();

      expect(mapType()).toBe('satellite');
      expect(traffic()).toHaveAttribute('aria-pressed', 'false');
      expect(liveTrafficLayers()).toHaveLength(0);
    });

    test('the layer does not outlive the component', async () => {
      const { unmount } = renderMap();
      fireEvent.click(traffic());
      await flush();

      unmount();
      expect(fake.trafficLayers).toHaveLength(1);
      expect(liveTrafficLayers()).toHaveLength(0);
    });
  });

  test('the map style button shows its state and turns off again', () => {
    renderMap();
    fireEvent.click(satellite());
    expect(mapType()).toBe('satellite');
    expect(satellite()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(satellite());
    expect(mapType()).toBe('roadmap');
    expect(satellite()).toHaveAttribute('aria-pressed', 'false');
  });

  describe('chargers', () => {
    const pins = () => screen.queryAllByTestId('charger-pin');

    test('load around the area on screen, not the car, and can be hidden', async () => {
      renderMap();
      fake.setViewportCenter({ lat: 40, lng: 50 });

      fireEvent.click(chargers());
      await flush();
      expect(chargers()).toHaveAttribute('aria-busy', 'true');
      expect(fake.nearbyCalls[0].request.locationRestriction).toMatchObject({
        center: { lat: 40, lng: 50 },
      });

      await settle(() =>
        fake.nearbyCalls[0].resolve({ places: [fake.charger('a', { lat: 40, lng: 50 })] }),
      );
      expect(chargers()).toHaveAttribute('aria-pressed', 'true');
      expect(chargers()).toHaveAttribute('aria-busy', 'false');
      expect(pins()).toHaveLength(1);

      fireEvent.click(chargers());
      await flush();
      expect(chargers()).toHaveAttribute('aria-pressed', 'false');
      expect(pins()).toHaveLength(0);
    });

    test('an empty result says so, unlike a failure', async () => {
      renderMap();
      fireEvent.click(chargers());
      await flush();
      await settle(() => fake.nearbyCalls[0].resolve({ places: [] }));

      expect(screen.getByText('No chargers found in this area.')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('a failure is visible and the button turns it off', async () => {
      renderMap();
      fireEvent.click(chargers());
      await flush();
      await settle(() => fake.nearbyCalls[0].reject(new Error('boom')));

      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load chargers.");
      expect(chargers()).toHaveClass('layerError');

      fireEvent.click(chargers());
      await flush();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(chargers()).toHaveAttribute('aria-pressed', 'false');
    });

    test('turning off during loading drops the response', async () => {
      renderMap();
      fireEvent.click(chargers());
      await flush();
      fireEvent.click(chargers());
      await flush();

      await settle(() =>
        fake.nearbyCalls[0].resolve({ places: [fake.charger('a', { lat: 1, lng: 1 })] }),
      );
      expect(pins()).toHaveLength(0);
    });

    test('a response from before a retoggle cannot replace the current one', async () => {
      renderMap();
      fireEvent.click(chargers());
      await flush();
      fireEvent.click(chargers());
      await flush();
      fireEvent.click(chargers());
      await flush();
      expect(fake.nearbyCalls).toHaveLength(2);

      await settle(() => fake.nearbyCalls[0].resolve({ places: [] }));
      expect(chargers()).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('locate', () => {
    test('moves the car marker and the map', async () => {
      const geolocation = stubGeolocation();
      renderMap();

      fireEvent.click(locate());
      await flush();
      expect(locate()).toHaveAttribute('aria-busy', 'true');

      await geolocation.succeed(0, 7, 8);
      expect(locate()).toHaveAttribute('aria-busy', 'false');
      expect(markers()).toContainEqual({ lat: 7, lng: 8 });
      expect(fake.map.panTo).toHaveBeenCalledExactlyOnceWith({ lat: 7, lng: 8 });
    });

    test('a second tap cancels, with no second request and no late jump', async () => {
      const geolocation = stubGeolocation();
      renderMap();

      fireEvent.click(locate());
      await flush();
      fireEvent.click(locate());
      await flush();
      expect(geolocation.getCurrentPosition).toHaveBeenCalledOnce();
      expect(locate()).toHaveAttribute('aria-busy', 'false');

      await geolocation.succeed(0, 7, 8);
      expect(fake.map.panTo).not.toHaveBeenCalled();
    });

    test('a failure is visible, and can be dismissed', async () => {
      const geolocation = stubGeolocation();
      renderMap();
      fireEvent.click(locate());
      await flush();

      await geolocation.fail(0, 1);
      expect(screen.getByRole('alert')).toHaveTextContent('Location access is blocked');
      expect(locate()).toHaveClass('layerError');

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(locate()).not.toHaveClass('layerError');
    });

    test('an unsupported browser is told so', () => {
      renderMap();
      fireEvent.click(locate());
      expect(screen.getByRole('alert')).toHaveTextContent("This browser can't share its location.");
    });
  });

  describe('car position and viewport', () => {
    test('routes start at the car, while searches are biased to the area on screen', async () => {
      const geolocation = stubGeolocation();
      renderMap();
      fireEvent.click(locate());
      await flush();
      await geolocation.succeed(0, 7, 8);
      fake.setViewportCenter({ lat: 40, lng: 50 });

      await choosePlace('Home', HOME);
      expect(fake.autocompleteCalls[0].request.locationBias).toEqual({ lat: 40, lng: 50 });

      await pressNavigate();
      expect(lastRouteCall().request.origin).toEqual({ lat: 7, lng: 8 });
    });

    test('End Navigation returns to the car, not the viewport', async () => {
      renderMap();
      await startTrip('Home', HOME);
      fake.setViewportCenter({ lat: 40, lng: 50 });
      fake.map.panTo.mockClear();

      fireEvent.click(endButton() as HTMLElement);
      await flush();

      expect(fake.map.panTo).toHaveBeenCalledExactlyOnceWith(markers()[0]);
      expect(markers()[0]).not.toEqual({ lat: 40, lng: 50 });
    });
  });

  test('the compass resets the heading', () => {
    renderMap();
    fireEvent.click(button('Reset map heading'));
    expect(fake.map.setHeading).toHaveBeenCalledWith(0);
  });
});

describe('no usable Google Maps key (#89)', () => {
  const MAP_BUTTONS = [
    'Reset map heading',
    'Satellite map',
    'Traffic',
    'Locate car',
    'Charging locations',
  ];

  function expectFallback(heading: string) {
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    expect(searchBox()).toBeDisabled();
    for (const name of MAP_BUTTONS) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  }

  test.each([
    ['empty', ''],
    ['blank', '   '],
    ['the template placeholder', 'YOUR_API_KEY_HERE'],
  ])('a key that is %s never reaches Google', (_name, key) => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', key);
    renderMap();

    expectFallback('Add a Google Maps key');
    expect(fake.apiProvider).toBeNull();
    expect(screen.getByText(/Copy \.env\.template to \.env/)).toBeInTheDocument();
  });

  test('the deployed site says maps are unavailable, with no setup talk', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    vi.stubEnv('DEV', false);
    renderMap();

    expectFallback('Maps are unavailable');
    expect(screen.queryByText(/\.env/)).not.toBeInTheDocument();
  });

  test('the top bar stays and Wi-Fi still works', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    const onWifiClick = vi.fn();
    renderMap(onWifiClick);

    fireEvent.click(screen.getByAltText('Wifi Status'));
    expect(onWifiClick).toHaveBeenCalledOnce();
  });

  test('a working key shows the map', () => {
    renderMap();

    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(fake.apiProvider?.apiKey).toBe('test-key');
    expect(searchBox()).toBeEnabled();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('a load failure swaps the map for the fallback', () => {
    renderMap();

    act(() => fake.apiProvider?.onError?.(new Error('script blocked')));

    expectFallback("Google Maps didn't load");
  });

  test("Google's auth failure callback swaps the map for the fallback", () => {
    renderMap();

    act(() => window.gm_authFailure?.());

    expectFallback('Google rejected the Maps key');
  });

  test('the auth failure callback does not outlive the component', () => {
    const { unmount } = renderMap();
    expect(window.gm_authFailure).toBeInstanceOf(Function);

    unmount();
    expect(window.gm_authFailure).toBeUndefined();
  });
});

describe('saved places (#157)', () => {
  const GYM_PLACE = { name: 'Gym', location: GYM };
  const savedList = () => screen.queryByRole('list', { name: 'Saved places' });
  const row = (name: string) => screen.getByRole('button', { name });

  const seed = (profileId: number, saved: object) =>
    window.localStorage.setItem(
      `tesla-saved-places-${profileId}`,
      JSON.stringify({ version: 1, saved }),
    );

  function SwitchProfile() {
    const { selectProfile } = useCarActions();
    return <button onClick={() => selectProfile(2)}>Switch profile</button>;
  }

  const renderWithProfileSwitch = () =>
    render(
      <CarStateProvider initialState={initialCarState}>
        <SwitchProfile />
        <MapNavigation onWifiClick={() => {}} />
      </CarStateProvider>,
    );

  beforeEach(() => window.localStorage.clear());

  test('focusing an empty search offers Home and Work, unset at first', () => {
    renderMap();
    expect(savedList()).not.toBeInTheDocument();

    fireEvent.focus(searchBox());

    expect(savedList()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Home/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Work/ })).toBeDisabled();
  });

  test('typing swaps saved places for suggestions, and leaving closes them', () => {
    renderMap();
    fireEvent.focus(searchBox());
    fireEvent.change(searchBox(), { target: { value: 'g' } });
    expect(savedList()).not.toBeInTheDocument();

    fireEvent.change(searchBox(), { target: { value: '' } });
    expect(savedList()).toBeInTheDocument();

    fireEvent.blur(searchBox());
    expect(savedList()).not.toBeInTheDocument();
  });

  test('a saved place is selected with no call to Google', async () => {
    seed(1, { home: { name: 'Home sweet home', location: HOME } });
    renderMap();
    fireEvent.focus(searchBox());

    fireEvent.mouseDown(screen.getByRole('button', { name: /^Home/ }));
    await flush();

    expect(savedList()).not.toBeInTheDocument();
    expect(searchBox()).toHaveValue('Home sweet home');
    expect(navigateButton()).toBeInTheDocument();
    expect(fake.autocompleteCalls).toHaveLength(0);
    expect(fake.detailCalls).toHaveLength(0);
  });

  test('a chosen place can be starred and set as Home', async () => {
    renderMap();
    await choosePlace('Gym', GYM);

    fireEvent.click(row('Favorite'));
    fireEvent.click(row('Home'));
    await flush();

    expect(row('Favorite')).toHaveAttribute('aria-pressed', 'true');
    expect(row('Home')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByAltText('Clear input'));
    fireEvent.focus(searchBox());
    await flush();

    expect(screen.getByRole('button', { name: 'Home Gym' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Favorite Gym' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('a trip lands in Recents, where a star saves it and × removes it', async () => {
    renderMap();
    await startTrip('Gym', GYM);
    fireEvent.click(endButton() as HTMLElement);
    fireEvent.focus(searchBox());
    await flush();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Favorite Gym' }));
    await flush();
    expect(screen.getAllByRole('button', { name: 'Favorite Gym' })).toHaveLength(2);

    fireEvent.mouseDown(row('Remove Gym from recents'));
    await flush();
    expect(screen.queryByRole('button', { name: 'Remove Gym from recents' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Favorite Gym' })).toHaveLength(1);
  });

  test('saved places survive a reload', async () => {
    const { unmount } = renderMap();
    await choosePlace('Gym', GYM);
    fireEvent.click(row('Work'));
    await flush();
    unmount();

    renderMap();
    fireEvent.focus(searchBox());
    expect(screen.getByRole('button', { name: 'Work Gym' })).toBeEnabled();
  });

  test('each profile has its own, and switching never overwrites the other', async () => {
    seed(1, { favorites: [GYM_PLACE] });
    seed(2, { home: { name: 'Second home', location: WORK } });
    renderWithProfileSwitch();
    fireEvent.focus(searchBox());
    expect(screen.getByRole('button', { name: 'Favorite Gym' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Switch profile'));
    await flush();

    expect(screen.queryByRole('button', { name: 'Favorite Gym' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Home Second home' })).toBeEnabled();
    expect(window.localStorage.getItem('tesla-saved-places-1')).toContain('Gym');
    expect(window.localStorage.getItem('tesla-saved-places-2')).not.toContain('Gym');
  });

  test('the disabled search offers nothing with no key', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    renderMap();

    fireEvent.focus(searchBox());

    expect(savedList()).not.toBeInTheDocument();
  });
});
