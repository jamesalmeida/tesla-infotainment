import { safeStorage } from '../../utils/safeStorage';
import type { Place } from './place';

export const MAX_RECENTS = 8;
const SCHEMA_VERSION = 1;

/** Home, Work, Favorites and Recents for one driver profile. */
export interface SavedPlaces {
  home: Place | null;
  work: Place | null;
  favorites: Place[];
  /** Newest first. */
  recents: Place[];
}

export type SavedPlacesAction =
  | { type: 'loaded'; saved: SavedPlaces }
  | { type: 'homeSet'; place: Place | null }
  | { type: 'workSet'; place: Place | null }
  | { type: 'favoriteToggled'; place: Place }
  | { type: 'recentAdded'; place: Place }
  | { type: 'recentRemoved'; place: Place };

export const emptySavedPlaces: SavedPlaces = { home: null, work: null, favorites: [], recents: [] };

// Two searches for one spot can return different names, so a place is where it is.
const COORDINATE_DECIMALS = 5;
export const placeKey = ({ location: { lat, lng } }: Place) =>
  `${lat.toFixed(COORDINATE_DECIMALS)},${lng.toFixed(COORDINATE_DECIMALS)}`;

export const isSamePlace = (a: Place | null, b: Place | null): boolean =>
  a !== null && b !== null && placeKey(a) === placeKey(b);

const without = (places: Place[], place: Place) => places.filter((p) => !isSamePlace(p, place));

export const isFavorite = (saved: SavedPlaces, place: Place): boolean =>
  saved.favorites.some((favorite) => isSamePlace(favorite, place));

export function savedPlacesReducer(state: SavedPlaces, action: SavedPlacesAction): SavedPlaces {
  switch (action.type) {
    case 'loaded':
      return action.saved;

    case 'homeSet':
      return { ...state, home: action.place };

    case 'workSet':
      return { ...state, work: action.place };

    case 'favoriteToggled':
      return {
        ...state,
        favorites: isFavorite(state, action.place)
          ? without(state.favorites, action.place)
          : [...state.favorites, action.place],
      };

    case 'recentAdded':
      return {
        ...state,
        recents: [action.place, ...without(state.recents, action.place)].slice(0, MAX_RECENTS),
      };

    case 'recentRemoved':
      return { ...state, recents: without(state.recents, action.place) };
  }
}

const storageKey = (profileId: number) => `tesla-saved-places-${profileId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCoordinate = (value: unknown, limit: number) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

function isPlace(value: unknown): value is Place {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isRecord(value.location) &&
    isCoordinate(value.location.lat, 90) &&
    isCoordinate(value.location.lng, 180)
  );
}

const placeOrNull = (value: unknown) => (isPlace(value) ? value : null);
const placeList = (value: unknown) => (Array.isArray(value) ? value.filter(isPlace) : []);

// Storage is outside the app's control, so anything malformed is dropped, not trusted.
export function parseSavedPlaces(raw: string | null): SavedPlaces {
  if (!raw) return emptySavedPlaces;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptySavedPlaces;
  }
  if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION || !isRecord(parsed.saved)) {
    return emptySavedPlaces;
  }
  const { home, work, favorites, recents } = parsed.saved;
  return {
    home: placeOrNull(home),
    work: placeOrNull(work),
    favorites: placeList(favorites),
    recents: placeList(recents).slice(0, MAX_RECENTS),
  };
}

export const loadSavedPlaces = (profileId: number): SavedPlaces =>
  parseSavedPlaces(safeStorage.getItem(storageKey(profileId)));

export function storeSavedPlaces(profileId: number, saved: SavedPlaces) {
  safeStorage.setItem(storageKey(profileId), JSON.stringify({ version: SCHEMA_VERSION, saved }));
}
