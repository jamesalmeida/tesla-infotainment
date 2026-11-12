import {
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { getImagePath } from '../../utils/assetPaths';
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
import type { SavedPlaces } from './savedPlaces';
import { SavedPlacesList, type SavedPlacesActions } from './SavedPlacesList';
import styles from './PlaceSearch.module.css';

const SUGGESTION_DELAY_MS = 200;
const LIST_ID = 'placeSuggestions';

// A suggestion known to be a place (not a query) prediction.
type PlaceSuggestion = google.maps.places.AutocompleteSuggestion & {
  placePrediction: google.maps.places.PlacePrediction;
};

const isPlaceSuggestion = (
  suggestion: google.maps.places.AutocompleteSuggestion,
): suggestion is PlaceSuggestion => Boolean(suggestion.placePrediction);

const optionId = (index: number) => `placeSuggestion-${index}`;

function statusMessage(status: SearchStatus<PlaceSuggestion>) {
  switch (status.kind) {
    case 'loading':
      return 'Searching…';
    case 'selecting':
      return 'Finding place…';
    case 'empty':
      return `No results for “${status.input}”`;
    case 'error':
      return status.failed === 'suggestions'
        ? "Search isn't working right now. Press Enter to try again."
        : "Couldn't load that place. Press Enter to try again.";
    default:
      return '';
  }
}

interface PlaceSearchProps {
  placesLibrary: google.maps.PlacesLibrary | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (place: Place) => void;
  onClear: () => void;
  getLocationBias: () => google.maps.LatLngLiteral;
  disabled?: boolean;
  /** Offered while the box is empty. Leave out to offer nothing. */
  saved?: SavedPlaces;
  savedActions?: SavedPlacesActions;
  /** A row joined under the box while it is idle, such as the next calendar destination. */
  footer?: ReactNode;
}

// Search box with place suggestions from the Places API (New). Replaces the legacy
// google.maps.places.Autocomplete widget, which is closed to new customers.
export function PlaceSearch({
  placesLibrary,
  query,
  onQueryChange,
  onSelect,
  onClear,
  getLocationBias,
  disabled = false,
  saved,
  savedActions,
  footer,
}: PlaceSearchProps) {
  const [{ status, requestId, sheetOpen }, dispatch] = useReducer<
    PlaceSearchState<PlaceSuggestion>,
    [PlaceSearchAction<PlaceSuggestion>]
  >(placeSearchReducer, initialPlaceSearchState<PlaceSuggestion>());
  // One session token per search, from the first keystroke until a place is picked or the
  // search is abandoned, so Google bills the suggestions and the place lookup as one session.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const fetchSuggestions = useEffectEvent(
    async (library: google.maps.PlacesLibrary, input: string, id: number) => {
      sessionTokenRef.current ??= new library.AutocompleteSessionToken();
      try {
        const response = await library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          locationBias: getLocationBias(),
          sessionToken: sessionTokenRef.current,
        });
        dispatch({
          type: 'suggestionsLoaded',
          requestId: id,
          suggestions: response.suggestions.filter(isPlaceSuggestion),
        });
      } catch (error) {
        console.error('Error fetching place suggestions', error);
        dispatch({ type: 'suggestionsFailed', requestId: id });
      }
    },
  );

  const fetchPlace = useEffectEvent(async (suggestion: PlaceSuggestion, id: number) => {
    // This lookup concludes the session, whether or not anyone still wants its answer.
    sessionTokenRef.current = null;
    const place = suggestion.placePrediction.toPlace();
    try {
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
    } catch (error) {
      console.error('Error fetching place details', error);
      dispatch({ type: 'selectionFailed', requestId: id });
      return;
    }
    if (!place.location) {
      dispatch({ type: 'selectionFailed', requestId: id });
      return;
    }
    dispatch({
      type: 'selectionResolved',
      requestId: id,
      place: {
        name: place.displayName || place.formattedAddress || suggestion.placePrediction.text.text,
        location: place.location.toJSON(),
      },
    });
  });

  const announceSelection = useEffectEvent((place: Place) => onSelect(place));

  const isDebouncing = status.kind === 'debouncing';
  useEffect(() => {
    if (!isDebouncing) return;
    const timer = setTimeout(
      () => dispatch({ type: 'debounceElapsed', requestId }),
      SUGGESTION_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [isDebouncing, requestId]);

  const loadingInput = status.kind === 'loading' ? status.input : null;
  useEffect(() => {
    if (loadingInput !== null && placesLibrary) {
      fetchSuggestions(placesLibrary, loadingInput, requestId);
    }
  }, [loadingInput, placesLibrary, requestId]);

  const selectingSuggestion = status.kind === 'selecting' ? status.suggestion : null;
  useEffect(() => {
    if (selectingSuggestion) fetchPlace(selectingSuggestion, requestId);
  }, [selectingSuggestion, requestId]);

  const selectedPlace = status.kind === 'selected' ? status.place : null;
  useEffect(() => {
    if (selectedPlace) announceSelection(selectedPlace);
  }, [selectedPlace]);

  const clear = () => {
    sessionTokenRef.current = null;
    dispatch({ type: 'cleared' });
    onClear();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.trim()) {
      onQueryChange(value);
      dispatch({ type: 'inputChanged', input: value });
    } else {
      clear();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      dispatch({ type: 'highlightMoved', by: e.key === 'ArrowDown' ? 1 : -1 });
    }
  };

  const handleContainerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') dispatch({ type: 'dismissed' });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'submitted', input: query });
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    // Tabbing from the box to a saved place is still using the search.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    // A committed choice finishes on its own and ends the session then.
    if (!isCommitted(status)) sessionTokenRef.current = null;
    dispatch({ type: 'blurred' });
  };

  const suggestions = listedSuggestions(status);
  const highlighted = status.kind === 'open' ? status.highlighted : -1;
  const message = statusMessage(status);
  const showFooter = Boolean(footer) && !sheetOpen && !query.trim();

  return (
    <div className={styles.placeSearch} onBlur={handleBlur} onKeyDown={handleContainerKeyDown}>
      <form
        className={`floatingBtn ${styles.navBtn} ${showFooter ? styles.joined : ''}`}
        onSubmit={handleSubmit}
      >
        <img className={styles.searchIcon} src={getImagePath('icon-search.svg')} alt="Search Map" />
        <input
          id="navigateTo"
          name="NavigateTo"
          placeholder="Navigate"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-label="Navigate"
          aria-autocomplete="list"
          aria-controls={LIST_ID}
          aria-expanded={suggestions.length > 0}
          aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
          disabled={disabled}
          value={query}
          onFocus={() => dispatch({ type: 'focused' })}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button type="button" className={styles.clearInput} onClick={clear}>
            <img src={getImagePath('icon-x.svg')} alt="Clear input" />
          </button>
        )}
      </form>
      {showFooter && <div className={`floatingBtn ${styles.searchFooter}`}>{footer}</div>}
      <div className={styles.searchPopover}>
        {sheetOpen && !query.trim() && saved && savedActions && (
          <SavedPlacesList
            saved={saved}
            actions={savedActions}
            onPick={(place) => dispatch({ type: 'placePicked', place })}
          />
        )}
        {/* Stays in the DOM, empty and hidden, so the input's aria-controls always resolves. */}
        <ul
          id={LIST_ID}
          className={styles.placeSuggestions}
          role="listbox"
          aria-label="Place suggestions"
          hidden={suggestions.length === 0}
        >
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            return (
              <li
                key={prediction.placeId}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlighted}
                className={`${styles.placeSuggestion} ${index === highlighted ? styles.highlighted : ''}`}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  dispatch({ type: 'suggestionPicked', index });
                }}
              >
                <span className={styles.placeSuggestionMain}>
                  {prediction.mainText?.text ?? prediction.text.text}
                </span>
                {prediction.secondaryText && (
                  <span className="placeSuggestionSecondary">{prediction.secondaryText.text}</span>
                )}
              </li>
            );
          })}
        </ul>
        {/* A live region has to exist before its text does for the change to be announced. */}
        <div role="status">
          {message && (
            <p
              className={`${styles.searchMessage} ${status.kind === 'error' ? styles.searchError : ''}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
