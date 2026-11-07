import type { MediaItem, MediaShelf } from './mediaLibrary';
import { safeStorage } from '../utils/safeStorage';

export const FAVORITES_KEY = 'tesla-media-favorites';
const MAX_FAVORITES = 40;

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && id !== '')
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export const readFavorites = (): string[] => parseFavorites(safeStorage.getItem(FAVORITES_KEY));

export const writeFavorites = (ids: string[]) => {
  safeStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.slice(0, MAX_FAVORITES)));
};

export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id)
    ? ids.filter((favorite) => favorite !== id)
    : [...ids, id].slice(0, MAX_FAVORITES);
}

export function allItems(shelves: MediaShelf[]): MediaItem[] {
  return shelves.flatMap((shelf) => shelf.collections.flatMap((collection) => collection.items));
}

const matches = (item: MediaItem, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.title, item.subtitle, item.description ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
};

// Search stays inside the shelves the screen already loaded, so it can't depend on a network
// round trip while someone is typing.
export function filterShelves(shelves: MediaShelf[], query: string): MediaShelf[] {
  if (!query.trim()) return shelves;
  return shelves
    .map((shelf) => ({
      ...shelf,
      collections: shelf.collections
        .map((collection) => ({
          ...collection,
          items: collection.items.filter((item) => matches(item, query)),
        }))
        .filter((collection) => collection.items.length > 0),
    }))
    .filter((shelf) => shelf.collections.length > 0);
}
