import { useSyncExternalStore } from 'react';
import { setMediaTransport } from '../state/mediaTransport';
import { safeStorage } from '../utils/safeStorage';
import { createAudioEngine, type PlaybackEngine, type PlaybackReport } from './audioEngine';
import { FEATURED_PODCASTS } from './featuredPodcasts';

export type { PlaybackEngine, PlaybackReport };

/* -------------------- What the apps browse -------------------- */

export interface MediaItem {
  id: string;
  title: string;
  // The artist, show or station.
  subtitle: string;
  collectionId: string;
  // Null when it isn't known up front, for a live stream or before an episode has loaded.
  durationSeconds: number | null;
  // A live stream has no position to seek or remember.
  live?: boolean;
  // Absent for sample content, which has no audio behind it.
  streamUrl?: string;
  // Cover art. Without it the art is drawn from the collection, so nothing breaks.
  artworkUrl?: string;
  // Which source it came from, so the player can show where it's playing from.
  sourceId?: MediaSourceId;
  // Episodes pick up where they stopped. Songs start over.
  resumable?: boolean;
  description?: string;
}

export interface MediaCollection {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl?: string;
  items: MediaItem[];
}

export interface MediaShelf {
  id: string;
  title: string;
  collections: MediaCollection[];
}

// A catalogue. Adding a new kind of audio means registering one of these: the media card, the
// full player and the shortcuts all work with it from then on.
export interface MediaSource {
  browse: () => Promise<MediaShelf[]>;
}

const collection = (
  id: string,
  title: string,
  subtitle: string,
  tracks: [string, number, string?][],
  resumable = false,
): MediaCollection => ({
  id,
  title,
  subtitle,
  items: tracks.map(([trackTitle, durationSeconds, description], index) => ({
    id: `${id}-${index + 1}`,
    title: trackTitle,
    subtitle,
    collectionId: id,
    durationSeconds,
    description,
    resumable,
  })),
});

// Every title and name here is invented.
const SAMPLE_MUSIC: MediaShelf[] = [
  {
    id: 'new',
    title: 'New this week',
    collections: [
      collection('glass-harbour', 'Glass Harbour', 'The Paper Lanterns', [
        ['Low Tide Radio', 214],
        ['Salt on the Dial', 187],
        ['Harbour Lights', 243],
        ['Second Ferry', 201],
      ]),
      collection('neon-orchard', 'Neon Orchard', 'Mira Sol & the Night Bus', [
        ['Orchard Static', 198],
        ['Night Bus Home', 226],
        ['Fruit of the Grid', 175],
      ]),
      collection('quiet-engines', 'Quiet Engines', 'Tessellate', [
        ['Coast Mode', 262],
        ['Regen', 239],
        ['Long Way Round', 305],
      ]),
    ],
  },
  {
    id: 'moods',
    title: 'For the drive',
    collections: [
      collection('sunday-miles', 'Sunday Miles', 'Various invented artists', [
        ['Open Window', 201],
        ['Slow Lane Serenade', 233],
        ['Rest Stop Waltz', 189],
      ]),
      collection('late-exit', 'Late Exit', 'Juniper Vale', [
        ['Half Past Nowhere', 218],
        ['Exit Sixteen', 244],
      ]),
      collection('morning-grid', 'Morning Grid', 'Copper Kites', [
        ['Sunrise Merge', 207],
        ['Green Wave', 192],
        ['Coffee Stop', 164],
      ]),
    ],
  },
];

const SAMPLE_PODCASTS: MediaShelf[] = [
  {
    id: 'shows',
    title: 'Shows',
    collections: [
      collection(
        'long-way-home',
        'The Long Way Home',
        'Stories from roads nobody planned to take',
        [
          ['The Map That Lied', 1860, 'A wrong turn, a closed bridge and a very good pie.'],
          ['Fuel for Thought', 2140, 'What people talk about after hour six.'],
          ['Town of One', 1745, 'The smallest post office in the county.'],
        ],
        true,
      ),
      collection(
        'small-machines',
        'Small Machines',
        'How everyday devices really work',
        [
          ['The Humble Relay', 1520, 'A tiny click that runs half your car.'],
          ['Why Wipers Stutter', 1395, 'Timing, friction and rain.'],
          ['Inside a Key Fob', 1680, 'A radio in your pocket.'],
          ['The Last Fuse', 1440, 'What protects what.'],
        ],
        true,
      ),
      collection(
        'kitchen-physics',
        'Kitchen Physics',
        'Science you can eat afterwards',
        [
          ['Toast, Explained', 1205, 'Browning, moisture and the perfect slice.'],
          ['The Spinning Egg', 1110, 'One simple test tells raw from cooked.'],
        ],
        true,
      ),
      collection(
        'atlas-of-sound',
        'Atlas of Sound',
        'Field recordings from invented places',
        [
          ['Rainfall on Tin', 2400, 'Forty minutes of weather.'],
          ['The Night Market', 2010, 'Footsteps, sizzling and distant bells.'],
        ],
        true,
      ),
    ],
  },
];

// Every item a source hands out is tagged with it, so the player knows where it came from.
const tagShelves = (id: MediaSourceId, shelves: MediaShelf[]): MediaShelf[] =>
  shelves.map((shelf) => ({
    ...shelf,
    collections: shelf.collections.map((shelfCollection) => ({
      ...shelfCollection,
      items: shelfCollection.items.map((item) => ({ ...item, sourceId: item.sourceId ?? id })),
    })),
  }));

const sources: Record<string, MediaSource> = {
  music: { browse: () => Promise.resolve(tagShelves('music', SAMPLE_MUSIC)) },
  podcasts: {
    browse: () => Promise.resolve(tagShelves('podcasts', [FEATURED_PODCASTS, ...SAMPLE_PODCASTS])),
  },
};

// Known sources. Radio streams live, from its own app, so it has no catalogue here.
export type MediaSourceId = 'music' | 'podcasts' | 'radio';

export const getMediaSource = (id: MediaSourceId): MediaSource => sources[id];

// Swap a catalogue without touching the screens, for example for MusicKit once there's a token.
export function setMediaSource(id: MediaSourceId, source: MediaSource) {
  sources[id] = source;
}

/* -------------------- Remembered positions -------------------- */

const POSITIONS_KEY = 'tesla-media-positions';
// Close enough to the end to count as finished.
const FINISHED_MARGIN_SECONDS = 15;

export type Positions = Record<string, number>;

export function parsePositions(raw: string | null): Positions {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0,
      ),
    );
  } catch {
    return {};
  }
}

// A finished episode is forgotten, so playing it again starts from the top.
export function updatePosition(positions: Positions, item: MediaItem, seconds: number): Positions {
  const { [item.id]: _previous, ...others } = positions;
  const duration = item.durationSeconds;
  if (duration !== null && seconds >= duration - FINISHED_MARGIN_SECONDS) return others;
  return { ...others, [item.id]: seconds };
}

let positions: Positions | null = null;

const readPositions = (): Positions => {
  positions ??= parsePositions(safeStorage.getItem(POSITIONS_KEY));
  return positions;
};

export const resumePosition = (item: MediaItem): number =>
  item.resumable ? (readPositions()[item.id] ?? 0) : 0;

/* -------------------- Playback -------------------- */

export interface NowPlaying {
  item: MediaItem | null;
  queue: MediaItem[];
  isPlaying: boolean;
  isLoading: boolean;
  positionSeconds: number;
  // The real length once the audio knows it, which a catalogue often doesn't.
  durationSeconds: number | null;
  error: string | null;
}

// Past this, Previous goes back to the start of the item rather than to the one before.
export const RESTART_THRESHOLD_SECONDS = 3;

const SAVE_POSITION_EVERY_SECONDS = 5;

// The media card shows something from the first moment, the way the car does: one of the
// featured episodes, cued but not loaded, so nothing downloads until play is pressed.
const featuredEpisodes = FEATURED_PODCASTS.collections.flatMap((show) =>
  show.items.map((item) => ({ ...item, sourceId: 'podcasts' as const })),
);

const cued = (): NowPlaying => {
  const item = featuredEpisodes[Math.floor(Math.random() * featuredEpisodes.length)] ?? null;
  return {
    item,
    queue: featuredEpisodes,
    isPlaying: false,
    isLoading: false,
    positionSeconds: 0,
    durationSeconds: item?.durationSeconds ?? null,
    error: null,
  };
};

let nowPlaying: NowPlaying = cued();
const listeners = new Set<() => void>();

const publish = (patch: Partial<NowPlaying>) => {
  nowPlaying = { ...nowPlaying, ...patch };
  listeners.forEach((listener) => listener());
};

let lastSavedPosition = 0;

function rememberPosition(force = false) {
  const { item, positionSeconds } = nowPlaying;
  if (!item?.resumable || item.live) return;
  if (!force && Math.abs(positionSeconds - lastSavedPosition) < SAVE_POSITION_EVERY_SECONDS) return;
  lastSavedPosition = positionSeconds;
  const sized = { ...item, durationSeconds: nowPlaying.durationSeconds ?? item.durationSeconds };
  positions = updatePosition(readPositions(), sized, positionSeconds);
  safeStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

function reportPlayback(report: PlaybackReport) {
  switch (report.type) {
    case 'position':
      if (report.seconds === nowPlaying.positionSeconds) return;
      publish({ positionSeconds: report.seconds });
      rememberPosition();
      break;
    case 'duration':
      publish({ durationSeconds: report.seconds ?? nowPlaying.item?.durationSeconds ?? null });
      break;
    case 'loading':
      publish({ isLoading: true, error: null });
      break;
    case 'playing':
      publish({ isPlaying: true, isLoading: false, error: null });
      break;
    case 'paused':
      publish({ isPlaying: false, isLoading: false });
      rememberPosition(true);
      break;
    case 'ended': {
      rememberPosition(true);
      // Plays on through the queue, and stops after the last item rather than starting over.
      const { item, queue } = nowPlaying;
      const index = item ? queue.findIndex((queued) => queued.id === item.id) : -1;
      if (index >= 0 && index < queue.length - 1) playItem(queue[index + 1], queue);
      else publish({ isPlaying: false, isLoading: false });
      break;
    }
    case 'failed':
      publish({ isPlaying: false, isLoading: false, error: report.message });
      break;
  }
}

let engine: PlaybackEngine = createAudioEngine(reportPlayback);

// For tests, and for a future engine such as one backed by a streaming SDK.
export function connectPlayback(
  connect: (report: (report: PlaybackReport) => void) => PlaybackEngine,
) {
  engine.stop();
  engine = connect(reportPlayback);
}

// Plays an item now, from where it was left if it's an episode. The queue is what Next and
// Previous move through, and it wraps around like the car's player.
export function playItem(item: MediaItem, queue: MediaItem[] = [item]) {
  rememberPosition(true);
  const startAt = item.live ? 0 : resumePosition(item);
  lastSavedPosition = startAt;
  publish({
    item,
    queue,
    isPlaying: false,
    isLoading: true,
    positionSeconds: startAt,
    durationSeconds: item.durationSeconds,
    error: null,
  });
  engine.play(item, startAt);
}

export function playCurrent() {
  const { item, queue } = nowPlaying;
  if (!item) return;
  // A cued item, or one that failed, has to load; anything else just carries on.
  if (engine.loadedId() !== item.id || nowPlaying.error) playItem(item, queue);
  else engine.resume();
}

export function pausePlayback() {
  if (nowPlaying.isPlaying || nowPlaying.isLoading) engine.pause();
}

export function togglePlayback() {
  if (!nowPlaying.item) return;
  if (nowPlaying.isPlaying || nowPlaying.isLoading) pausePlayback();
  else playCurrent();
}

export function seekPlayback(seconds: number) {
  if (nowPlaying.item?.live) return;
  engine.seek(seconds);
  rememberPosition(true);
}

export const nextInQueue = (queue: MediaItem[], current: MediaItem, step: number) => {
  if (queue.length === 0) return undefined;
  const index = queue.findIndex((item) => item.id === current.id);
  return queue[(index + step + queue.length) % queue.length];
};

// Moves through the queue, carrying on playing if it was. Previous restarts the item first
// once it is a few seconds in, as most players do.
export function skip(step: 1 | -1) {
  const { item, queue, isPlaying, isLoading, positionSeconds } = nowPlaying;
  if (!item) return;
  if (step === -1 && !item.live && positionSeconds > RESTART_THRESHOLD_SECONDS) {
    seekPlayback(0);
    return;
  }
  const next = nextInQueue(queue, item, step);
  if (!next) return;
  if (isPlaying || isLoading || engine.loadedId() === item.id) {
    playItem(next, queue);
  } else {
    // Nothing is loaded yet: just cue the next one, as the card does before first play.
    publish({
      item: next,
      positionSeconds: next.live ? 0 : resumePosition(next),
      durationSeconds: next.durationSeconds,
      error: null,
    });
  }
}

export function stopPlayback() {
  rememberPosition(true);
  engine.stop();
  publish({ ...cued(), item: null, queue: [] });
}

// For apps whose sound must not outlive their screen. Anything else playing is left alone.
export function stopItem(id: string) {
  if (nowPlaying.item?.id === id) stopPlayback();
}

export const setPlaybackVolume = (volume: number) => engine.setVolume(volume);

// Shortcuts, voice and the rear display all drive the player through this.
setMediaTransport({
  togglePlayPause: togglePlayback,
  play: playCurrent,
  pause: pausePlayback,
  next: () => skip(1),
  previous: () => skip(-1),
  isPlaying: () => nowPlaying.isPlaying,
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNowPlaying = (): NowPlaying => useSyncExternalStore(subscribe, () => nowPlaying);

// One part of what's playing, so a component only re-renders when that part changes. The
// selector must return a primitive or an object already in the state.
export const useNowPlayingValue = <T>(selector: (now: NowPlaying) => T): T =>
  useSyncExternalStore(subscribe, () => selector(nowPlaying));

// Tests start each case with nothing loaded and from what is in storage.
export function resetMediaLibrary(options: { cue?: boolean } = {}) {
  engine.stop();
  engine = createAudioEngine(reportPlayback);
  nowPlaying = options.cue ? cued() : { ...cued(), item: null, queue: [] };
  positions = null;
  lastSavedPosition = 0;
}

export const formatMediaTime = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};
