import type { MediaItem } from '../../../apps/mediaLibrary';
import { safeStorage } from '../../../utils/safeStorage';

export interface Station {
  id: string;
  name: string;
  url: string;
  place: string;
  tags: string;
}

export interface StationQuery {
  name?: string;
  tag?: string;
}

// Radio Browser is a free community directory with no key. Mirrors come and go, so more than one
// is tried. https://www.radio-browser.info
export const DIRECTORY_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

export const GENRES = ['Top', 'Jazz', 'Rock', 'Pop', 'Classical', 'News', 'Ambient'];

const RESULT_LIMIT = 40;
const REQUEST_TIMEOUT_MS = 6000;
const FAVOURITES_KEY = 'tesla-radio-favourites';

interface DirectoryStation {
  stationuuid?: unknown;
  name?: unknown;
  url_resolved?: unknown;
  country?: unknown;
  tags?: unknown;
  hls?: unknown;
  lastcheckok?: unknown;
}

export function directoryPath({ name, tag }: StationQuery): string {
  const params = new URLSearchParams({
    limit: String(RESULT_LIMIT),
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
    is_https: 'true',
  });
  if (name) params.set('name', name);
  if (tag) params.set('tag', tag.toLowerCase());
  return `/json/stations/search?${params}`;
}

// Keeps what an audio element on a secure page can play. Station logos are left behind on
// purpose: they would be hotlinked third-party artwork (#90).
export function toStations(raw: unknown): Station[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: DirectoryStation): Station[] => {
    const { stationuuid, name, url_resolved: url, country, tags, hls, lastcheckok } = entry ?? {};
    if (typeof stationuuid !== 'string' || typeof url !== 'string') return [];
    if (typeof name !== 'string' || !name.trim()) return [];
    if (!url.startsWith('https://') || /\.m3u8(\?|$)/i.test(url)) return [];
    if (hls === 1 || lastcheckok === 0) return [];
    return [
      {
        id: stationuuid,
        name: name.trim(),
        url,
        place: typeof country === 'string' ? country : '',
        tags: typeof tags === 'string' ? tags.split(',').slice(0, 3).join(', ') : '',
      },
    ];
  });
}

async function fetchWithTimeout(url: string, fetcher: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Directory answered ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Throws only once every mirror has failed.
export async function fetchStations(
  query: StationQuery,
  fetcher: typeof fetch = fetch,
): Promise<Station[]> {
  const path = directoryPath(query);
  let lastError: unknown;
  for (const host of DIRECTORY_HOSTS) {
    try {
      return toStations(await fetchWithTimeout(`${host}${path}`, fetcher));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export const toMediaItem = (station: Station): MediaItem => ({
  id: `radio-${station.id}`,
  title: station.name,
  subtitle: station.place || 'Internet radio',
  collectionId: `radio-${station.id}`,
  durationSeconds: null,
  live: true,
  streamUrl: station.url,
  sourceId: 'radio',
});

const isStation = (value: unknown): value is Station => {
  const station = value as Station | null;
  return (
    typeof station?.id === 'string' &&
    typeof station.name === 'string' &&
    typeof station.url === 'string' &&
    station.url.startsWith('https://')
  );
};

export function loadFavourites(): Station[] {
  try {
    const parsed: unknown = JSON.parse(safeStorage.getItem(FAVOURITES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isStation) : [];
  } catch {
    return [];
  }
}

export const saveFavourites = (stations: Station[]) =>
  safeStorage.setItem(FAVOURITES_KEY, JSON.stringify(stations));

export const toggleFavourite = (favourites: Station[], station: Station): Station[] =>
  favourites.some((item) => item.id === station.id)
    ? favourites.filter((item) => item.id !== station.id)
    : [...favourites, station];
