import type { Place } from './place';

/*
 * The search box's lifecycle as a pure reducer. `S` is a suggestion; the reducer never
 * looks inside one, so it stays free of Google types.
 *
 * `requestId` is one counter for suggestion and detail fetches alike. Anything that makes
 * an in-flight response unwanted moves it on, and a response carrying an old id is dropped.
 */
export type SearchStatus<S> =
  | { kind: 'closed' }
  | { kind: 'debouncing'; input: string; suggestions: S[] }
  | { kind: 'loading'; input: string; suggestions: S[]; selectFirst: boolean }
  | { kind: 'open'; input: string; suggestions: S[]; highlighted: number }
  | { kind: 'empty'; input: string }
  | { kind: 'selecting'; input: string; suggestion: S }
  | { kind: 'selected'; place: Place }
  | { kind: 'error'; input: string; failed: 'suggestions' | 'details' };

export interface PlaceSearchState<S> {
  status: SearchStatus<S>;
  requestId: number;
}

export type PlaceSearchAction<S> =
  | { type: 'inputChanged'; input: string }
  | { type: 'debounceElapsed'; requestId: number }
  | { type: 'suggestionsLoaded'; requestId: number; suggestions: S[] }
  | { type: 'suggestionsFailed'; requestId: number }
  | { type: 'highlightMoved'; by: 1 | -1 }
  | { type: 'submitted'; input: string }
  | { type: 'suggestionPicked'; index: number }
  | { type: 'selectionResolved'; requestId: number; place: Place }
  | { type: 'selectionFailed'; requestId: number }
  | { type: 'dismissed' }
  | { type: 'blurred' }
  | { type: 'cleared' };

export function initialPlaceSearchState<S>(): PlaceSearchState<S> {
  return { status: { kind: 'closed' }, requestId: 0 };
}

/** The suggestions on screen. Old ones stay up while newer ones load, to avoid a flicker. */
export function listedSuggestions<S>(status: SearchStatus<S>): S[] {
  return status.kind === 'open' || status.kind === 'debouncing' || status.kind === 'loading'
    ? status.suggestions
    : [];
}

/** True once the user has chosen, so leaving the input must not throw the choice away. */
export function isCommitted<S>(status: SearchStatus<S>): boolean {
  return status.kind === 'selecting' || (status.kind === 'loading' && status.selectFirst);
}

function next<S>(state: PlaceSearchState<S>, status: SearchStatus<S>): PlaceSearchState<S> {
  return { status, requestId: state.requestId + 1 };
}

function close<S>(state: PlaceSearchState<S>): PlaceSearchState<S> {
  // A placed search stays `selected`, so Enter on it doesn't search again.
  return state.status.kind === 'closed' || state.status.kind === 'selected'
    ? state
    : next(state, { kind: 'closed' });
}

function select<S>(state: PlaceSearchState<S>, input: string, suggestion: S | undefined) {
  return suggestion === undefined ? state : next(state, { kind: 'selecting', input, suggestion });
}

export function placeSearchReducer<S>(
  state: PlaceSearchState<S>,
  action: PlaceSearchAction<S>,
): PlaceSearchState<S> {
  const { status } = state;
  const isStale = 'requestId' in action && action.requestId !== state.requestId;
  if (isStale) return state;

  switch (action.type) {
    case 'inputChanged':
      return next(state, {
        kind: 'debouncing',
        input: action.input,
        suggestions: listedSuggestions(status),
      });

    case 'debounceElapsed':
      if (status.kind !== 'debouncing') return state;
      return { ...state, status: { ...status, kind: 'loading', selectFirst: false } };

    case 'suggestionsLoaded':
      if (status.kind !== 'loading') return state;
      if (action.suggestions.length === 0) {
        return { ...state, status: { kind: 'empty', input: status.input } };
      }
      if (status.selectFirst) return select(state, status.input, action.suggestions[0]);
      return {
        ...state,
        status: {
          kind: 'open',
          input: status.input,
          suggestions: action.suggestions,
          highlighted: -1,
        },
      };

    case 'suggestionsFailed':
      if (status.kind !== 'loading') return state;
      return { ...state, status: { kind: 'error', input: status.input, failed: 'suggestions' } };

    case 'highlightMoved': {
      if (status.kind !== 'open') return state;
      const count = status.suggestions.length;
      const highlighted =
        action.by === 1
          ? (status.highlighted + 1) % count
          : status.highlighted <= 0
            ? count - 1
            : status.highlighted - 1;
      return { ...state, status: { ...status, highlighted } };
    }

    case 'submitted':
      switch (status.kind) {
        case 'debouncing':
          // Skip the rest of the wait: the user is done typing.
          return { ...state, status: { ...status, kind: 'loading', selectFirst: true } };
        case 'loading':
          return { ...state, status: { ...status, selectFirst: true } };
        case 'open':
          return select(state, status.input, status.suggestions[Math.max(status.highlighted, 0)]);
        case 'error':
          return next(state, {
            kind: 'loading',
            input: status.input,
            suggestions: [],
            selectFirst: true,
          });
        case 'closed':
          if (!action.input.trim()) return state;
          return next(state, {
            kind: 'loading',
            input: action.input,
            suggestions: [],
            selectFirst: true,
          });
        default:
          return state;
      }

    case 'suggestionPicked': {
      if (status.kind !== 'open' && status.kind !== 'debouncing' && status.kind !== 'loading') {
        return state;
      }
      return select(state, status.input, status.suggestions[action.index]);
    }

    case 'selectionResolved':
      if (status.kind !== 'selecting') return state;
      return { ...state, status: { kind: 'selected', place: action.place } };

    case 'selectionFailed':
      if (status.kind !== 'selecting') return state;
      return { ...state, status: { kind: 'error', input: status.input, failed: 'details' } };

    case 'dismissed':
      return close(state);

    case 'blurred':
      return isCommitted(status) ? state : close(state);

    case 'cleared':
      return next(state, { kind: 'closed' });
  }
}
