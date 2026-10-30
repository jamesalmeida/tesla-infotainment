import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import './PlaceSearch.css';

const SUGGESTION_DELAY_MS = 200;

export interface SelectedPlace {
  name: string;
  location: google.maps.LatLngLiteral;
}

// A suggestion known to be a place (not a query) prediction.
type PlaceSuggestion = google.maps.places.AutocompleteSuggestion & {
  placePrediction: google.maps.places.PlacePrediction;
};

const isPlaceSuggestion = (
  suggestion: google.maps.places.AutocompleteSuggestion,
): suggestion is PlaceSuggestion => Boolean(suggestion.placePrediction);

interface PlaceSearchProps {
  placesLibrary: google.maps.PlacesLibrary | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (place: SelectedPlace) => void;
  onClear: () => void;
  locationBias: google.maps.LatLngLiteral;
}

// Search box with place suggestions from the Places API (New). Replaces the legacy
// google.maps.places.Autocomplete widget, which is closed to new customers.
export function PlaceSearch({
  placesLibrary,
  query,
  onQueryChange,
  onSelect,
  onClear,
  locationBias,
}: PlaceSearchProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  // One session token per search, from the first keystroke until a place is picked,
  // so Google bills the suggestions and the place lookup as a single session.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestIdRef = useRef(0);

  const closeSuggestions = () => {
    clearTimeout(timerRef.current);
    requestIdRef.current += 1; // ignore responses still in flight
    setSuggestions([]);
    setHighlighted(-1);
  };

  const fetchSuggestions = async (input: string) => {
    if (!placesLibrary) return;
    const requestId = ++requestIdRef.current;
    sessionTokenRef.current ??= new placesLibrary.AutocompleteSessionToken();
    try {
      const response = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        locationBias,
        sessionToken: sessionTokenRef.current,
      });
      if (requestId !== requestIdRef.current) return;
      setSuggestions(response.suggestions.filter(isPlaceSuggestion));
      setHighlighted(-1);
    } catch (error) {
      console.error('Error fetching place suggestions', error);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onQueryChange(value);
    clearTimeout(timerRef.current);
    if (!placesLibrary || !value.trim()) {
      closeSuggestions();
      return;
    }
    timerRef.current = setTimeout(() => fetchSuggestions(value), SUGGESTION_DELAY_MS);
  };

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    closeSuggestions();
    const place = suggestion.placePrediction.toPlace();
    try {
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
    } catch (error) {
      console.error('Error fetching place details', error);
      return;
    } finally {
      sessionTokenRef.current = null;
    }
    if (!place.location) return;
    onSelect({
      name: place.displayName || place.formattedAddress || suggestion.placePrediction.text.text,
      location: place.location.toJSON(),
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const suggestion = suggestions[Math.max(highlighted, 0)];
    if (suggestion) selectSuggestion(suggestion);
  };

  const handleClear = () => {
    closeSuggestions();
    onClear();
  };

  return (
    <div className="placeSearch">
      <form className="floatingBtn navBtn" onSubmit={handleSubmit}>
        <img className="searchIcon" src={getImagePath('icon-search.svg')} alt="Search Map" />
        <input
          id="navigateTo"
          name="NavigateTo"
          placeholder="Navigate"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="placeSuggestions"
          aria-expanded={suggestions.length > 0}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={closeSuggestions}
        />
        {query && (
          <button type="button" className="clearInput" onClick={handleClear}>
            <img src={getImagePath('icon-x.svg')} alt="Clear input" />
          </button>
        )}
      </form>
      {suggestions.length > 0 && (
        <ul id="placeSuggestions" className="placeSuggestions" role="listbox">
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            return (
              <li
                key={prediction.placeId}
                role="option"
                aria-selected={index === highlighted}
                className={`placeSuggestion ${index === highlighted ? 'highlighted' : ''}`}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(suggestion);
                }}
              >
                <span className="placeSuggestionMain">
                  {prediction.mainText?.text ?? prediction.text.text}
                </span>
                {prediction.secondaryText && (
                  <span className="placeSuggestionSecondary">{prediction.secondaryText.text}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
