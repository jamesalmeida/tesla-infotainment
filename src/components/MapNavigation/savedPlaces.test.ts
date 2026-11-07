import type { Place } from './place';
import {
  emptySavedPlaces,
  isFavorite,
  isSamePlace,
  loadSavedPlaces,
  MAX_RECENTS,
  parseSavedPlaces,
  savedPlacesReducer,
  storeSavedPlaces,
  type SavedPlaces,
  type SavedPlacesAction,
} from './savedPlaces';

const home: Place = { name: 'Home', location: { lat: 1, lng: 1 } };
const work: Place = { name: 'Work', location: { lat: 2, lng: 2 } };
const gym: Place = { name: 'Gym', location: { lat: 3, lng: 3 } };
const sameGym: Place = { name: 'The gym', location: { lat: 3.000001, lng: 3 } };

const withFavorite: SavedPlaces = { ...emptySavedPlaces, favorites: [gym] };
const withRecents: SavedPlaces = { ...emptySavedPlaces, recents: [work, gym] };

describe('savedPlacesReducer', () => {
  const transitions: [string, SavedPlaces, SavedPlacesAction, SavedPlaces][] = [
    [
      'loading replaces everything',
      withRecents,
      { type: 'loaded', saved: withFavorite },
      withFavorite,
    ],
    [
      'home can be set',
      emptySavedPlaces,
      { type: 'homeSet', place: home },
      { ...emptySavedPlaces, home },
    ],
    [
      'home can be cleared',
      { ...emptySavedPlaces, home },
      { type: 'homeSet', place: null },
      emptySavedPlaces,
    ],
    [
      'work can be set',
      emptySavedPlaces,
      { type: 'workSet', place: work },
      { ...emptySavedPlaces, work },
    ],
    [
      'work can be cleared',
      { ...emptySavedPlaces, work },
      { type: 'workSet', place: null },
      emptySavedPlaces,
    ],
    [
      'a star saves a favorite',
      emptySavedPlaces,
      { type: 'favoriteToggled', place: gym },
      withFavorite,
    ],
    [
      'a second star removes it',
      withFavorite,
      { type: 'favoriteToggled', place: gym },
      emptySavedPlaces,
    ],
    [
      'the same spot counts under another name',
      withFavorite,
      { type: 'favoriteToggled', place: sameGym },
      emptySavedPlaces,
    ],
    [
      'a recent goes first',
      withRecents,
      { type: 'recentAdded', place: home },
      { ...emptySavedPlaces, recents: [home, work, gym] },
    ],
    [
      'a repeat moves up rather than doubling',
      withRecents,
      { type: 'recentAdded', place: sameGym },
      { ...emptySavedPlaces, recents: [sameGym, work] },
    ],
    [
      'a recent can be removed',
      withRecents,
      { type: 'recentRemoved', place: work },
      { ...emptySavedPlaces, recents: [gym] },
    ],
  ];

  test.each(transitions)('%s', (_name, state, action, expected) => {
    expect(savedPlacesReducer(state, action)).toEqual(expected);
  });

  test('recents stop growing', () => {
    let state = emptySavedPlaces;
    for (let i = 0; i < MAX_RECENTS + 3; i++) {
      state = savedPlacesReducer(state, {
        type: 'recentAdded',
        place: { name: `Place ${i}`, location: { lat: i, lng: i } },
      });
    }
    expect(state.recents).toHaveLength(MAX_RECENTS);
    expect(state.recents[0].name).toBe(`Place ${MAX_RECENTS + 2}`);
  });
});

test('places match on position, not name', () => {
  expect(isSamePlace(gym, sameGym)).toBe(true);
  expect(isSamePlace(gym, home)).toBe(false);
  expect(isSamePlace(gym, null)).toBe(false);
  expect(isFavorite(withFavorite, sameGym)).toBe(true);
});

describe('stored places', () => {
  beforeEach(() => window.localStorage.clear());

  test('each profile keeps its own', () => {
    storeSavedPlaces(1, { ...emptySavedPlaces, home });
    storeSavedPlaces(2, { ...emptySavedPlaces, home: work });

    expect(loadSavedPlaces(1).home).toEqual(home);
    expect(loadSavedPlaces(2).home).toEqual(work);
    expect(loadSavedPlaces(3)).toEqual(emptySavedPlaces);
  });

  test.each([
    ['nothing', null],
    ['broken JSON', '{'],
    ['another version', JSON.stringify({ version: 99, saved: { home } })],
    ['the wrong shape', JSON.stringify({ version: 1, saved: 'home' })],
  ])('%s falls back to empty', (_name, raw) => {
    expect(parseSavedPlaces(raw)).toEqual(emptySavedPlaces);
  });

  test('malformed entries are dropped and the good ones kept', () => {
    const raw = JSON.stringify({
      version: 1,
      saved: {
        home: { name: 'Home', location: { lat: 999, lng: 1 } },
        work,
        favorites: [gym, { name: 'No location' }, 'nope'],
        recents: 'nope',
      },
    });
    expect(parseSavedPlaces(raw)).toEqual({
      home: null,
      work,
      favorites: [gym],
      recents: [],
    });
  });
});
