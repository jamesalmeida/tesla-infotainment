import {
  activeTripOf,
  initialNavState,
  navigateTarget,
  navReducer,
  searchedPlaceOf,
  type NavAction,
  type NavState,
  type Route,
  type Trip,
} from './navState';
import type { Place } from './place';

const home: Place = { name: 'Home', location: { lat: 1, lng: 1 } };
const work: Place = { name: 'Work', location: { lat: 2, lng: 2 } };
const gym: Place = { name: 'Gym', location: { lat: 3, lng: 3 } };
const homeRoute: Route = { path: [{ lat: 1, lng: 1 }], viewport: null };
const workRoute: Route = { path: [{ lat: 2, lng: 2 }], viewport: null };
const trip: Trip = { place: home, route: homeRoute };

const idle: NavState = { kind: 'idle' };
const selected: NavState = { kind: 'placeSelected', place: home };
const routing: NavState = { kind: 'routing', place: home, requestId: 7, activeTrip: null };
const failed: NavState = { kind: 'routeFailed', place: home, reason: 'nope', activeTrip: null };
const navigating: NavState = { kind: 'navigating', ...trip, candidate: null };
const withCandidate: NavState = { kind: 'navigating', ...trip, candidate: work };
const rerouting: NavState = { kind: 'routing', place: work, requestId: 7, activeTrip: trip };
const rerouteFailed: NavState = {
  kind: 'routeFailed',
  place: work,
  reason: 'nope',
  activeTrip: trip,
};

const CHOOSE_WORK: NavAction = { type: 'placeChosen', place: work };
const CHOOSE_GYM: NavAction = { type: 'placeChosen', place: gym };
const CLEAR: NavAction = { type: 'searchCleared' };
const END: NavAction = { type: 'navigationEnded' };
const NAVIGATE: NavAction = { type: 'navigatePressed', requestId: 8 };
const FOUND: NavAction = { type: 'routeFound', requestId: 7, route: workRoute };
const NOT_FOUND: NavAction = { type: 'routeNotFound', requestId: 7, reason: 'no road' };
const STALE_FOUND: NavAction = { type: 'routeFound', requestId: 6, route: workRoute };
const STALE_NOT_FOUND: NavAction = { type: 'routeNotFound', requestId: 6, reason: 'late' };

describe('navReducer', () => {
  const transitions: [string, NavState, NavAction, NavState][] = [
    // Picking a place
    ['choosing a place selects it', idle, CHOOSE_WORK, { kind: 'placeSelected', place: work }],
    ['choosing another replaces it', selected, CHOOSE_WORK, { kind: 'placeSelected', place: work }],
    [
      'choosing during routing drops the request',
      routing,
      CHOOSE_WORK,
      { kind: 'placeSelected', place: work },
    ],
    [
      'choosing after a failure starts again',
      failed,
      CHOOSE_WORK,
      { kind: 'placeSelected', place: work },
    ],

    // #49: new search during navigation leaves the route alone until Navigate is pressed
    [
      'searching during navigation lines up a candidate, route unchanged',
      navigating,
      CHOOSE_WORK,
      withCandidate,
    ],
    [
      'a second search replaces the candidate',
      withCandidate,
      CHOOSE_GYM,
      { kind: 'navigating', ...trip, candidate: gym },
    ],
    [
      'Navigate routes to the candidate and keeps the trip meanwhile',
      withCandidate,
      NAVIGATE,
      { kind: 'routing', place: work, requestId: 8, activeTrip: trip },
    ],
    [
      'the new route replaces the old one',
      rerouting,
      FOUND,
      { kind: 'navigating', place: work, route: workRoute, candidate: null },
    ],
    [
      'a failed reroute keeps the trip',
      rerouting,
      NOT_FOUND,
      { kind: 'routeFailed', place: work, reason: 'no road', activeTrip: trip },
    ],
    [
      'choosing during a reroute drops the request and keeps the trip',
      rerouting,
      CHOOSE_GYM,
      { kind: 'navigating', ...trip, candidate: gym },
    ],
    [
      'choosing after a failed reroute keeps the trip',
      rerouteFailed,
      CHOOSE_GYM,
      { kind: 'navigating', ...trip, candidate: gym },
    ],

    // #49: clear
    ['clear drops a selected place', selected, CLEAR, idle],
    ['clear during routing drops the request', routing, CLEAR, idle],
    ['clear dismisses a failure', failed, CLEAR, idle],
    ['clear during navigation keeps the route', navigating, CLEAR, navigating],
    ['clear during navigation drops only the candidate', withCandidate, CLEAR, navigating],
    ['clear during a reroute goes back to the trip', rerouting, CLEAR, navigating],
    ['clear after a failed reroute goes back to the trip', rerouteFailed, CLEAR, navigating],

    // Routing
    [
      'Navigate starts routing',
      selected,
      NAVIGATE,
      { kind: 'routing', place: home, requestId: 8, activeTrip: null },
    ],
    [
      'Navigate retries a failure',
      failed,
      NAVIGATE,
      { kind: 'routing', place: home, requestId: 8, activeTrip: null },
    ],
    [
      'Navigate retries a failed reroute, keeping the trip',
      rerouteFailed,
      NAVIGATE,
      { kind: 'routing', place: work, requestId: 8, activeTrip: trip },
    ],
    [
      'a route starts navigation',
      routing,
      FOUND,
      { kind: 'navigating', place: home, route: workRoute, candidate: null },
    ],
    [
      'a failure is reported',
      routing,
      NOT_FOUND,
      { kind: 'routeFailed', place: home, reason: 'no road', activeTrip: null },
    ],

    // Ending
    ['End stops navigation', navigating, END, idle],
    ['End also drops the candidate', withCandidate, END, idle],
    ['End during a reroute stops everything', rerouting, END, idle],
    ['End after a failed reroute stops everything', rerouteFailed, END, idle],
  ];

  test.each(transitions)('%s', (_name, from, action, expected) => {
    expect(navReducer(from, action)).toEqual(expected);
  });

  const ignored: [string, NavState, NavAction][] = [
    // #49: double-click Navigate
    ['a second Navigate while routing', routing, NAVIGATE],
    ['a second Navigate while rerouting', rerouting, NAVIGATE],
    ['Navigate with nothing selected', idle, NAVIGATE],
    ['Navigate with nothing new to route to', navigating, NAVIGATE],

    // Stale responses
    ['a stale route', routing, STALE_FOUND],
    ['a stale failure', routing, STALE_NOT_FOUND],
    ['a stale route during a reroute', rerouting, STALE_FOUND],

    // #49: clear while routing, then the response lands
    ['a route after clear', idle, FOUND],
    ['a failure after clear', idle, NOT_FOUND],
    ['a route for a place since replaced', selected, FOUND],
    ['a route after navigation ended', idle, STALE_FOUND],
    ['a late route once navigating', navigating, FOUND],
    ['a late failure once navigating', navigating, NOT_FOUND],
    ['a route after failure', failed, FOUND],

    ['clear when idle', idle, CLEAR],
  ];

  test.each(ignored)('ignores %s', (_name, from, action) => {
    expect(navReducer(from, action)).toBe(from);
  });
});

describe('selectors', () => {
  test.each<[string, NavState, Trip | null]>([
    ['idle', idle, null],
    ['selected', selected, null],
    ['routing', routing, null],
    ['failed', failed, null],
    ['navigating', navigating, trip],
    ['navigating with a candidate', withCandidate, trip],
    ['rerouting', rerouting, trip],
    ['a failed reroute', rerouteFailed, trip],
  ])('active trip when %s', (_name, state, expected) => {
    expect(activeTripOf(state)).toEqual(expected);
  });

  test.each<[string, NavState, Place | null]>([
    ['idle', idle, null],
    ['selected', selected, home],
    ['routing', routing, null],
    ['failed', failed, home],
    ['navigating', navigating, null],
    ['navigating with a candidate', withCandidate, work],
    ['rerouting', rerouting, null],
    ['a failed reroute', rerouteFailed, work],
  ])('Navigate target when %s', (_name, state, expected) => {
    expect(navigateTarget(state)).toEqual(expected);
  });

  test.each<[string, NavState, Place | null]>([
    ['idle', idle, null],
    ['selected', selected, home],
    ['routing', routing, home],
    ['failed', failed, home],
    ['navigating', navigating, null],
    ['navigating with a candidate', withCandidate, work],
    ['rerouting', rerouting, work],
    ['a failed reroute', rerouteFailed, work],
  ])('searched place when %s', (_name, state, expected) => {
    expect(searchedPlaceOf(state)).toEqual(expected);
  });

  test('starts idle', () => {
    expect(initialNavState).toEqual(idle);
  });
});
