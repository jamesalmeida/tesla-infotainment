import type { Place } from './place';
import {
  initialPlaceSearchState,
  isCommitted,
  listedSuggestions,
  placeSearchReducer,
  type PlaceSearchAction,
  type PlaceSearchState,
  type SearchStatus,
} from './placeSearchState';

type State = PlaceSearchState<string>;
type Status = SearchStatus<string>;
type Action = PlaceSearchAction<string>;

const place: Place = { name: 'Cafe', location: { lat: 1, lng: 2 } };
const ID = 5;
const STALE = 4;

const at = (status: Status): State => ({ status, requestId: ID });
const closed: Status = { kind: 'closed' };
const debouncing: Status = { kind: 'debouncing', input: 'ca', suggestions: [] };
const debouncingOverList: Status = { kind: 'debouncing', input: 'caf', suggestions: ['old'] };
const loading: Status = { kind: 'loading', input: 'ca', suggestions: [], selectFirst: false };
const loadingOverList: Status = { ...loading, suggestions: ['old'] };
const loadingCommitted: Status = { ...loading, selectFirst: true };
const open: Status = { kind: 'open', input: 'ca', suggestions: ['a', 'b', 'c'], highlighted: -1 };
const empty: Status = { kind: 'empty', input: 'ca' };
const selecting: Status = { kind: 'selecting', input: 'ca', suggestion: 'a' };
const selected: Status = { kind: 'selected', place };
const searchError: Status = { kind: 'error', input: 'ca', failed: 'suggestions' };

// `requestId` is ID when the transition keeps the running request, ID + 1 when it starts
// a new one or abandons it.
const same = (status: Status): State => ({ status, requestId: ID });
const bumped = (status: Status): State => ({ status, requestId: ID + 1 });

describe('placeSearchReducer', () => {
  const transitions: [string, Status, Action, State][] = [
    // Typing
    [
      'typing starts the debounce',
      closed,
      { type: 'inputChanged', input: 'c' },
      bumped({ kind: 'debouncing', input: 'c', suggestions: [] }),
    ],
    [
      'typing again restarts the debounce',
      debouncing,
      { type: 'inputChanged', input: 'caf' },
      bumped({ kind: 'debouncing', input: 'caf', suggestions: [] }),
    ],
    [
      'typing over an open list keeps it up until the new results arrive',
      open,
      { type: 'inputChanged', input: 'caf' },
      bumped({ kind: 'debouncing', input: 'caf', suggestions: ['a', 'b', 'c'] }),
    ],
    [
      'typing during loading abandons that request',
      loading,
      { type: 'inputChanged', input: 'caf' },
      bumped({ kind: 'debouncing', input: 'caf', suggestions: [] }),
    ],
    [
      'typing during selecting abandons the detail fetch (the selection race)',
      selecting,
      { type: 'inputChanged', input: 'cafe' },
      bumped({ kind: 'debouncing', input: 'cafe', suggestions: [] }),
    ],
    [
      'typing after an error starts over',
      searchError,
      { type: 'inputChanged', input: 'caf' },
      bumped({ kind: 'debouncing', input: 'caf', suggestions: [] }),
    ],
    [
      'typing after a selection starts a new search',
      selected,
      { type: 'inputChanged', input: 'Cafe 2' },
      bumped({ kind: 'debouncing', input: 'Cafe 2', suggestions: [] }),
    ],

    // Debounce and suggestions
    [
      'the debounce elapsing starts loading under the same request',
      debouncing,
      { type: 'debounceElapsed', requestId: ID },
      same(loading),
    ],
    [
      'old suggestions stay listed while loading',
      debouncingOverList,
      { type: 'debounceElapsed', requestId: ID },
      same({ kind: 'loading', input: 'caf', suggestions: ['old'], selectFirst: false }),
    ],
    [
      'suggestions open the list',
      loading,
      { type: 'suggestionsLoaded', requestId: ID, suggestions: ['a', 'b'] },
      same({ kind: 'open', input: 'ca', suggestions: ['a', 'b'], highlighted: -1 }),
    ],
    [
      'no suggestions is its own state',
      loadingOverList,
      { type: 'suggestionsLoaded', requestId: ID, suggestions: [] },
      same(empty),
    ],
    [
      'a failed fetch is an error, and old suggestions go',
      loadingOverList,
      { type: 'suggestionsFailed', requestId: ID },
      same(searchError),
    ],

    // Enter
    [
      'Enter during the debounce fetches now and commits to the first result',
      debouncing,
      { type: 'submitted', input: 'ca' },
      same(loadingCommitted),
    ],
    [
      'Enter during loading commits to the first result',
      loading,
      { type: 'submitted', input: 'ca' },
      same(loadingCommitted),
    ],
    [
      'the first result is selected once it arrives',
      loadingCommitted,
      { type: 'suggestionsLoaded', requestId: ID, suggestions: ['a', 'b'] },
      bumped(selecting),
    ],
    [
      'a committed search with no results reports empty',
      loadingCommitted,
      { type: 'suggestionsLoaded', requestId: ID, suggestions: [] },
      same(empty),
    ],
    [
      'a committed search that fails reports the error',
      loadingCommitted,
      { type: 'suggestionsFailed', requestId: ID },
      same(searchError),
    ],
    [
      'Enter on an open list picks the first entry',
      open,
      { type: 'submitted', input: 'ca' },
      bumped(selecting),
    ],
    [
      'Enter on an open list picks the highlighted entry',
      { ...(open as Extract<Status, { kind: 'open' }>), highlighted: 1 },
      { type: 'submitted', input: 'ca' },
      bumped({ kind: 'selecting', input: 'ca', suggestion: 'b' }),
    ],
    [
      'Enter after an error retries',
      searchError,
      { type: 'submitted', input: 'ca' },
      bumped(loadingCommitted),
    ],
    [
      'Enter with text in a closed box searches',
      closed,
      { type: 'submitted', input: 'ca' },
      bumped(loadingCommitted),
    ],
    [
      'Enter in an empty closed box does nothing',
      closed,
      { type: 'submitted', input: ' ' },
      at(closed),
    ],
    ['Enter on no results does nothing', empty, { type: 'submitted', input: 'ca' }, at(empty)],
    [
      'Enter during selecting does nothing',
      selecting,
      { type: 'submitted', input: 'ca' },
      at(selecting),
    ],
    [
      'Enter on a chosen place does not search again',
      selected,
      { type: 'submitted', input: 'Cafe' },
      at(selected),
    ],

    // Keyboard highlight
    [
      'ArrowDown highlights the first entry',
      open,
      { type: 'highlightMoved', by: 1 },
      same({ ...(open as Extract<Status, { kind: 'open' }>), highlighted: 0 }),
    ],
    [
      'ArrowDown wraps',
      { ...(open as Extract<Status, { kind: 'open' }>), highlighted: 2 },
      { type: 'highlightMoved', by: 1 },
      same({ ...(open as Extract<Status, { kind: 'open' }>), highlighted: 0 }),
    ],
    [
      'ArrowUp wraps to the last entry',
      open,
      { type: 'highlightMoved', by: -1 },
      same({ ...(open as Extract<Status, { kind: 'open' }>), highlighted: 2 }),
    ],
    [
      'arrows do nothing while loading',
      loadingOverList,
      { type: 'highlightMoved', by: 1 },
      at(loadingOverList),
    ],

    // Picking with the pointer
    [
      'picking from an open list selects it',
      open,
      { type: 'suggestionPicked', index: 1 },
      bumped({ kind: 'selecting', input: 'ca', suggestion: 'b' }),
    ],
    [
      'picking an old suggestion during loading selects it and drops the fetch',
      loadingOverList,
      { type: 'suggestionPicked', index: 0 },
      bumped({ kind: 'selecting', input: 'ca', suggestion: 'old' }),
    ],

    // Selection
    [
      'details arriving finishes the selection',
      selecting,
      { type: 'selectionResolved', requestId: ID, place },
      same(selected),
    ],
    [
      'failed details are an error',
      selecting,
      { type: 'selectionFailed', requestId: ID },
      same({ kind: 'error', input: 'ca', failed: 'details' }),
    ],

    // Leaving
    ['Escape closes the list', open, { type: 'dismissed' }, bumped(closed)],
    ['Escape cancels the debounce', debouncing, { type: 'dismissed' }, bumped(closed)],
    ['Escape cancels a committed search', loadingCommitted, { type: 'dismissed' }, bumped(closed)],
    ['Escape cancels a selection', selecting, { type: 'dismissed' }, bumped(closed)],
    ['Escape closes a message', searchError, { type: 'dismissed' }, bumped(closed)],
    ['Escape on a closed box does nothing', closed, { type: 'dismissed' }, at(closed)],
    ['blur closes the list', open, { type: 'blurred' }, bumped(closed)],
    ['blur cancels the debounce', debouncing, { type: 'blurred' }, bumped(closed)],
    ['blur abandons a plain load', loading, { type: 'blurred' }, bumped(closed)],
    [
      'blur leaves a committed search running',
      loadingCommitted,
      { type: 'blurred' },
      at(loadingCommitted),
    ],
    ['blur leaves a selection running', selecting, { type: 'blurred' }, at(selecting)],
    ['blur keeps a chosen place', selected, { type: 'blurred' }, at(selected)],
    ['clear abandons a selection', selecting, { type: 'cleared' }, bumped(closed)],
    ['clear abandons a committed search', loadingCommitted, { type: 'cleared' }, bumped(closed)],
    ['clear closes a chosen place', selected, { type: 'cleared' }, bumped(closed)],
  ];

  test.each(transitions)('%s', (_name, from, action, expected) => {
    expect(placeSearchReducer(at(from), action)).toEqual(expected);
  });

  const staleResponses: [string, Status, Action][] = [
    ['debounce', debouncing, { type: 'debounceElapsed', requestId: STALE }],
    ['suggestions', loading, { type: 'suggestionsLoaded', requestId: STALE, suggestions: ['a'] }],
    ['failed suggestions', loading, { type: 'suggestionsFailed', requestId: STALE }],
    ['place details', selecting, { type: 'selectionResolved', requestId: STALE, place }],
    ['failed place details', selecting, { type: 'selectionFailed', requestId: STALE }],
    [
      'suggestions, after a selection began',
      selecting,
      { type: 'suggestionsLoaded', requestId: STALE, suggestions: ['a'] },
    ],
    [
      'place details, after typing resumed',
      debouncing,
      { type: 'selectionResolved', requestId: STALE, place },
    ],
    [
      'place details, after clearing',
      closed,
      { type: 'selectionResolved', requestId: STALE, place },
    ],
  ];

  test.each(staleResponses)('ignores stale %s', (_name, from, action) => {
    const state = at(from);
    expect(placeSearchReducer(state, action)).toBe(state);
  });

  const outOfPlace: [string, Status, Action][] = [
    [
      'suggestions without a load',
      open,
      { type: 'suggestionsLoaded', requestId: ID, suggestions: ['z'] },
    ],
    ['failed suggestions without a load', open, { type: 'suggestionsFailed', requestId: ID }],
    ['details without a selection', open, { type: 'selectionResolved', requestId: ID, place }],
    ['failed details without a selection', open, { type: 'selectionFailed', requestId: ID }],
    ['debounce without a debounce', open, { type: 'debounceElapsed', requestId: ID }],
    ['picking with no list', empty, { type: 'suggestionPicked', index: 0 }],
    ['picking past the end of the list', open, { type: 'suggestionPicked', index: 9 }],
  ];

  test.each(outOfPlace)('ignores %s', (_name, from, action) => {
    const state = at(from);
    expect(placeSearchReducer(state, action)).toBe(state);
  });
});

describe('selectors', () => {
  test('starts closed', () => {
    expect(initialPlaceSearchState<string>()).toEqual({ status: closed, requestId: 0 });
  });

  test.each<[Status, string[]]>([
    [open, ['a', 'b', 'c']],
    [debouncingOverList, ['old']],
    [loadingOverList, ['old']],
    [closed, []],
    [selecting, []],
    [empty, []],
  ])('lists suggestions for %o', (status, expected) => {
    expect(listedSuggestions(status)).toEqual(expected);
  });

  test.each<[Status, boolean]>([
    [selecting, true],
    [loadingCommitted, true],
    [loading, false],
    [open, false],
    [closed, false],
  ])('commitment of %o', (status, expected) => {
    expect(isCommitted(status)).toBe(expected);
  });
});
