import { filterShelves, parseFavorites, toggleFavorite } from './mediaFavorites';
import type { MediaShelf } from './mediaLibrary';

const shelves: MediaShelf[] = [
  {
    id: 'music',
    title: 'Music',
    collections: [
      {
        id: 'harbour',
        title: 'Glass Harbour',
        subtitle: 'The Paper Lanterns',
        items: [
          {
            id: 'harbour-1',
            title: 'Harbour Lights',
            subtitle: 'The Paper Lanterns',
            collectionId: 'harbour',
            durationSeconds: 200,
          },
          {
            id: 'harbour-2',
            title: 'Low Tide Radio',
            subtitle: 'The Paper Lanterns',
            collectionId: 'harbour',
            durationSeconds: 210,
          },
        ],
      },
    ],
  },
];

test('favorites survive a round trip and ignore junk', () => {
  expect(parseFavorites(null)).toEqual([]);
  expect(parseFavorites('not json')).toEqual([]);
  expect(parseFavorites(JSON.stringify(['a', 2, 'b', '']))).toEqual(['a', 'b']);
});

test('toggling adds and removes the same id', () => {
  const added = toggleFavorite([], 'harbour-1');
  expect(added).toEqual(['harbour-1']);
  expect(toggleFavorite(added, 'harbour-1')).toEqual([]);
});

test('search filters items without losing their collection', () => {
  const results = filterShelves(shelves, 'harbour lights');
  expect(results).toHaveLength(1);
  expect(results[0].collections[0].items.map((item) => item.id)).toEqual(['harbour-1']);
});

test('an empty search returns everything', () => {
  expect(filterShelves(shelves, '   ')).toBe(shelves);
});
