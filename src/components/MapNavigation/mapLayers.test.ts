import {
  initialMapLayers,
  mapLayersReducer,
  type MapLayersAction,
  type MapLayersState,
} from './mapLayers';

const CAR = { lat: 9, lng: 9 };
const charger = { id: 'c1', location: null };
const ID = 3;

const state = (overrides: Partial<MapLayersState>): MapLayersState => ({
  ...initialMapLayers,
  chargerRequestId: ID,
  locationRequestId: ID,
  ...overrides,
});

const base = state({});
const roadmap = base;
const satellite = state({ mapStyle: 'satellite' });
const trafficOn = state({ traffic: true });
const chargersLoading = state({ chargers: 'loading' });
const chargersOn = state({ chargers: 'on', chargerResults: [charger] });
const chargersError = state({ chargers: 'error' });
const locating = state({ location: 'locating' });
const locateError = state({ location: 'error', locationError: 'nope' });

describe('mapLayersReducer', () => {
  const transitions: [string, MapLayersState, MapLayersAction, MapLayersState][] = [
    // Map style and traffic, including the rule between them in both directions
    ['satellite turns on', roadmap, { type: 'mapStyleToggled' }, satellite],
    ['satellite turns off', satellite, { type: 'mapStyleToggled' }, roadmap],
    ['traffic turns on', roadmap, { type: 'trafficToggled' }, trafficOn],
    ['traffic turns off', trafficOn, { type: 'trafficToggled' }, roadmap],
    ['traffic forces the road map', satellite, { type: 'trafficToggled' }, trafficOn],
    ['satellite forces traffic off', trafficOn, { type: 'mapStyleToggled' }, satellite],

    // Chargers
    [
      'chargers start loading',
      base,
      { type: 'chargersToggled' },
      { ...chargersLoading, chargerRequestId: ID + 1 },
    ],
    [
      'tapping during loading cancels',
      chargersLoading,
      { type: 'chargersToggled' },
      { ...base, chargerRequestId: ID + 1 },
    ],
    [
      'chargers can be hidden',
      chargersOn,
      { type: 'chargersToggled' },
      { ...base, chargerRequestId: ID + 1 },
    ],
    [
      'a charger error can be turned off',
      chargersError,
      { type: 'chargersToggled' },
      { ...base, chargerRequestId: ID + 1 },
    ],
    [
      'results show',
      chargersLoading,
      { type: 'chargersLoaded', requestId: ID, chargers: [charger] },
      chargersOn,
    ],
    [
      'no results differ from a failure',
      chargersLoading,
      { type: 'chargersLoaded', requestId: ID, chargers: [] },
      state({ chargers: 'on', chargerResults: [] }),
    ],
    ['a failure shows', chargersLoading, { type: 'chargersFailed', requestId: ID }, chargersError],

    // Location
    [
      'Locate starts',
      base,
      { type: 'locatePressed', supported: true },
      { ...locating, locationRequestId: ID + 1 },
    ],
    [
      'a second tap cancels instead of sending another request',
      locating,
      { type: 'locatePressed', supported: true },
      { ...base, locationRequestId: ID + 1 },
    ],
    [
      'Locate retries after an error',
      locateError,
      { type: 'locatePressed', supported: true },
      { ...locating, locationRequestId: ID + 1 },
    ],
    [
      'an unsupported browser fails straight away',
      base,
      { type: 'locatePressed', supported: false },
      state({ location: 'error', locationError: "This browser can't share its location." }),
    ],
    [
      'a position moves the car',
      locating,
      { type: 'located', requestId: ID, position: CAR },
      state({ carPosition: CAR }),
    ],
    [
      'denied',
      locating,
      { type: 'locateFailed', requestId: ID, code: 1 },
      state({
        location: 'error',
        locationError:
          'Location access is blocked. Allow it in your browser settings to use Locate.',
      }),
    ],
    [
      'unavailable',
      locating,
      { type: 'locateFailed', requestId: ID, code: 2 },
      state({ location: 'error', locationError: "Your location isn't available right now." }),
    ],
    [
      'timed out',
      locating,
      { type: 'locateFailed', requestId: ID, code: 3 },
      state({ location: 'error', locationError: 'Finding your location took too long.' }),
    ],
    ['an error can be dismissed', locateError, { type: 'locationErrorDismissed' }, base],
  ];

  test.each(transitions)('%s', (_name, from, action, expected) => {
    expect(mapLayersReducer(from, action)).toEqual(expected);
  });

  const ignored: [string, MapLayersState, MapLayersAction][] = [
    [
      'a stale charger result',
      chargersLoading,
      { type: 'chargersLoaded', requestId: ID - 1, chargers: [charger] },
    ],
    ['a stale charger failure', chargersLoading, { type: 'chargersFailed', requestId: ID - 1 }],
    [
      'charger results after turning off',
      base,
      { type: 'chargersLoaded', requestId: ID, chargers: [charger] },
    ],
    ['a charger failure after turning off', base, { type: 'chargersFailed', requestId: ID }],
    ['a stale position', locating, { type: 'located', requestId: ID - 1, position: CAR }],
    ['a stale location failure', locating, { type: 'locateFailed', requestId: ID - 1, code: 1 }],
    ['a position after cancelling', base, { type: 'located', requestId: ID, position: CAR }],
    ['a location failure after cancelling', base, { type: 'locateFailed', requestId: ID, code: 1 }],
    ['dismissing with no error', base, { type: 'locationErrorDismissed' }],
  ];

  test.each(ignored)('ignores %s', (_name, from, action) => {
    expect(mapLayersReducer(from, action)).toBe(from);
  });
});

describe('live location and following (#161)', () => {
  const on: MapLayersState = { ...initialMapLayers, liveLocation: 'on' };
  const waiting: MapLayersState = { ...initialMapLayers, liveLocation: 'waiting' };
  const free: MapLayersState = { ...initialMapLayers, following: false };
  const blocked = 'Location access is blocked. Allow it in your browser settings to use Locate.';

  const transitions: [string, MapLayersState, MapLayersAction, MapLayersState][] = [
    [
      'switching on waits for a fix',
      initialMapLayers,
      { type: 'liveLocationToggled', supported: true },
      waiting,
    ],
    [
      'with no geolocation it reports instead',
      initialMapLayers,
      { type: 'liveLocationToggled', supported: false },
      {
        ...initialMapLayers,
        location: 'error',
        locationError: "This browser can't share its location.",
      },
    ],
    [
      'switching off while waiting',
      waiting,
      { type: 'liveLocationToggled', supported: true },
      initialMapLayers,
    ],
    [
      'switching off once on',
      on,
      { type: 'liveLocationToggled', supported: true },
      initialMapLayers,
    ],
    ['the first fix confirms it', waiting, { type: 'liveFixReceived' }, on],
    ['later fixes change nothing', on, { type: 'liveFixReceived' }, on],
    [
      'a stray fix after off is ignored',
      initialMapLayers,
      { type: 'liveFixReceived' },
      initialMapLayers,
    ],
    [
      'a refusal turns it off',
      on,
      { type: 'liveLocationFailed', code: 1 },
      { ...initialMapLayers, location: 'error', locationError: blocked },
    ],
    ['a lost signal does not', on, { type: 'liveLocationFailed', code: 2 }, on],
    ['nor does a timeout', on, { type: 'liveLocationFailed', code: 3 }, on],
    [
      'a stray error after off is ignored',
      initialMapLayers,
      { type: 'liveLocationFailed', code: 1 },
      initialMapLayers,
    ],
    ['panning stops following', initialMapLayers, { type: 'followStopped' }, free],
    ['recentring resumes it', free, { type: 'followResumed' }, initialMapLayers],
  ];

  test.each(transitions)('%s', (_name, state, action, expected) => {
    expect(mapLayersReducer(state, action)).toEqual(expected);
  });

  test.each<[string, MapLayersState, MapLayersAction]>([
    ['stopping twice', free, { type: 'followStopped' }],
    ['resuming twice', initialMapLayers, { type: 'followResumed' }],
  ])('%s keeps the same state, so nothing re-renders', (_name, state, action) => {
    expect(mapLayersReducer(state, action)).toBe(state);
  });

  test('a located fix resumes following', () => {
    const locating: MapLayersState = {
      ...free,
      location: 'locating',
      locationRequestId: 3,
    };
    const position = { lat: 1, lng: 2 };

    expect(mapLayersReducer(locating, { type: 'located', requestId: 3, position })).toMatchObject({
      following: true,
      carPosition: position,
    });
  });
});
