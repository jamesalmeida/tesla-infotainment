import type { Place } from './place';

export interface Route {
  path: google.maps.LatLngLiteral[];
  viewport: google.maps.LatLngBounds | null;
  distanceMeters: number;
  durationSeconds: number;
}

export interface Trip {
  place: Place;
  route: Route;
}

/*
 * The navigation flow as one pure reducer.
 *
 * Searching during navigation only lines up a `candidate`: the active trip keeps running
 * until Navigate is pressed, and it survives until a route to the candidate actually
 * arrives. `routing` and `routeFailed` carry that trip in `activeTrip`. (#156 can turn the
 * candidate into a stop later.)
 */
export type NavState =
  | { kind: 'idle' }
  | { kind: 'placeSelected'; place: Place }
  | { kind: 'routing'; place: Place; requestId: number; activeTrip: Trip | null }
  | { kind: 'navigating'; place: Place; route: Route; candidate: Place | null }
  | { kind: 'routeFailed'; place: Place; reason: string; activeTrip: Trip | null };

export type NavAction =
  | { type: 'placeChosen'; place: Place }
  | { type: 'searchCleared' }
  | { type: 'navigatePressed'; requestId: number }
  | { type: 'routeFound'; requestId: number; route: Route }
  | { type: 'routeNotFound'; requestId: number; reason: string }
  | { type: 'navigationEnded' };

export const initialNavState: NavState = { kind: 'idle' };

/** The trip being driven right now, whatever the search box is doing. */
export function activeTripOf(state: NavState): Trip | null {
  switch (state.kind) {
    case 'navigating':
      return { place: state.place, route: state.route };
    case 'routing':
    case 'routeFailed':
      return state.activeTrip;
    default:
      return null;
  }
}

/** The place Navigate would route to, or null if it has nothing to do. */
export function navigateTarget(state: NavState): Place | null {
  switch (state.kind) {
    case 'placeSelected':
    case 'routeFailed':
      return state.place;
    case 'navigating':
      return state.candidate;
    default:
      return null;
  }
}

/** The searched-for place to mark on the map, separate from the trip's own destination. */
export function searchedPlaceOf(state: NavState): Place | null {
  return state.kind === 'routing' ? state.place : navigateTarget(state);
}

function withTrip(trip: Trip | null, candidate: Place | null): NavState {
  if (trip) return { kind: 'navigating', ...trip, candidate };
  return candidate ? { kind: 'placeSelected', place: candidate } : { kind: 'idle' };
}

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'placeChosen':
      return withTrip(activeTripOf(state), action.place);

    case 'searchCleared':
      return state.kind === 'idle' ? state : withTrip(activeTripOf(state), null);

    case 'navigatePressed': {
      const place = navigateTarget(state);
      if (!place) return state;
      return {
        kind: 'routing',
        place,
        requestId: action.requestId,
        activeTrip: activeTripOf(state),
      };
    }

    case 'routeFound':
      if (state.kind !== 'routing' || state.requestId !== action.requestId) return state;
      return { kind: 'navigating', place: state.place, route: action.route, candidate: null };

    case 'routeNotFound':
      if (state.kind !== 'routing' || state.requestId !== action.requestId) return state;
      return {
        kind: 'routeFailed',
        place: state.place,
        reason: action.reason,
        activeTrip: state.activeTrip,
      };

    case 'navigationEnded':
      return initialNavState;
  }
}
