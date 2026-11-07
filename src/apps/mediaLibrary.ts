import { useSyncExternalStore } from 'react';
import { safeStorage } from '../utils/safeStorage';

/* -------------------- What the apps browse -------------------- */

export interface MediaItem {
  id: string;
  title: string;
  // The artist, show or station.
  subtitle: string;
  collectionId: string;
  // Null for a live stream.
  durationSeconds: number | null;
  // Absent for sample content, which has no audio behind it.
  streamUrl?: string;
  // Episodes pick up where they stopped. Songs start over.
  resumable?: boolean;
  description?: string;
}

export interface MediaCollection {
  id: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
}

export interface MediaShelf {
  id: string;
  title: string;
  collections: MediaCollection[];
}

// A catalogue. Sample data today; a MusicKit or RSS version only has to implement this.
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

const sources: Record<string, MediaSource> = {
  music: { browse: () => Promise.resolve(SAMPLE_MUSIC) },
  podcasts: { browse: () => Promise.resolve(SAMPLE_PODCASTS) },
};

export type MediaSourceId = 'music' | 'podcasts';

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
  error: string | null;
}

// What MusicPanel's playback has to offer for these apps to use it. It reports back through
// `reportPlayback`, which is passed in when it connects.
export interface PlaybackEngine {
  play: (item: MediaItem, startAtSeconds: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

export type PlaybackReport =
  | { type: 'position'; seconds: number }
  | { type: 'playing' }
  | { type: 'paused' }
  | { type: 'ended' }
  | { type: 'failed'; message: string };

const idle: NowPlaying = {
  item: null,
  queue: [],
  isPlaying: false,
  isLoading: false,
  positionSeconds: 0,
  error: null,
};

let nowPlaying = idle;
const listeners = new Set<() => void>();

const publish = (patch: Partial<NowPlaying>) => {
  nowPlaying = { ...nowPlaying, ...patch };
  listeners.forEach((listener) => listener());
};

const SAVE_POSITION_EVERY_SECONDS = 5;
let lastSavedPosition = 0;

function rememberPosition(force = false) {
  const { item, positionSeconds } = nowPlaying;
  if (!item?.resumable) return;
  if (!force && Math.abs(positionSeconds - lastSavedPosition) < SAVE_POSITION_EVERY_SECONDS) return;
  lastSavedPosition = positionSeconds;
  positions = updatePosition(readPositions(), item, positionSeconds);
  safeStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

function reportPlayback(report: PlaybackReport) {
  switch (report.type) {
    case 'position':
      publish({ positionSeconds: report.seconds });
      rememberPosition();
      break;
    case 'playing':
      publish({ isPlaying: true, isLoading: false, error: null });
      break;
    case 'paused':
      publish({ isPlaying: false, isLoading: false });
      rememberPosition(true);
      break;
    case 'ended':
      rememberPosition(true);
      skip(1);
      break;
    case 'failed':
      publish({ isPlaying: false, isLoading: false, error: report.message });
      break;
  }
}

const CLOCK_TICK_MS = 250;
const STREAM_TIMEOUT_MS = 12000;
const STREAM_FAILED = "This stream can't be played right now.";

// Stands in until the real player is connected. Anything with a stream plays through its own
// audio element, and sample content has no audio, so a clock moves it along silently.
function createPreviewEngine(report: (report: PlaybackReport) => void): PlaybackEngine {
  let audio: HTMLAudioElement | null = null;
  let clock: ReturnType<typeof setInterval> | undefined;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  let position = 0;
  let duration: number | null = null;
  let volume = 0.5;

  const stopClock = () => clearInterval(clock);

  const startClock = () => {
    stopClock();
    let last = Date.now();
    clock = setInterval(() => {
      const now = Date.now();
      position += (now - last) / 1000;
      last = now;
      if (duration !== null && position >= duration) {
        stopClock();
        report({ type: 'ended' });
      } else {
        report({ type: 'position', seconds: position });
      }
    }, CLOCK_TICK_MS);
  };

  const releaseAudio = () => {
    clearTimeout(loadTimer);
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio = null;
  };

  const startAudio = (element: HTMLAudioElement) => {
    element.play().catch((error: Error) => {
      if (error.name === 'AbortError') return;
      report({ type: 'failed', message: STREAM_FAILED });
    });
  };

  return {
    play(item, startAtSeconds) {
      stopClock();
      releaseAudio();
      position = startAtSeconds;
      duration = item.durationSeconds;
      if (!item.streamUrl) {
        startClock();
        report({ type: 'playing' });
        return;
      }
      const element = new Audio(item.streamUrl);
      audio = element;
      element.volume = volume;
      element.currentTime = startAtSeconds;
      // A dead stream can hang without ever raising an error.
      loadTimer = setTimeout(
        () => report({ type: 'failed', message: STREAM_FAILED }),
        STREAM_TIMEOUT_MS,
      );
      element.addEventListener('playing', () => {
        clearTimeout(loadTimer);
        report({ type: 'playing' });
      });
      element.addEventListener('timeupdate', () =>
        report({ type: 'position', seconds: element.currentTime }),
      );
      element.addEventListener('ended', () => report({ type: 'ended' }));
      element.addEventListener('error', () => {
        clearTimeout(loadTimer);
        report({ type: 'failed', message: STREAM_FAILED });
      });
      startAudio(element);
    },
    pause() {
      stopClock();
      audio?.pause();
      report({ type: 'paused' });
    },
    resume() {
      if (audio) startAudio(audio);
      else startClock();
      report({ type: 'playing' });
    },
    seek(seconds) {
      position = seconds;
      if (audio) audio.currentTime = seconds;
      report({ type: 'position', seconds });
    },
    stop() {
      stopClock();
      releaseAudio();
    },
    setVolume(next) {
      volume = next / 100;
      if (audio) audio.volume = volume;
    },
  };
}

let engine = createPreviewEngine(reportPlayback);

// THE WIRING POINT. Call this once with the real player (usePlayback) and every media app plays
// through it: Music, Podcasts, Radio and Caraoke, including queueing and remembered positions.
// The engine reports position, state and the end of each item through the callback it is given.
export function connectPlayback(
  connect: (report: (report: PlaybackReport) => void) => PlaybackEngine,
) {
  engine.stop();
  engine = connect(reportPlayback);
}

export function playItem(item: MediaItem, queue: MediaItem[] = [item]) {
  rememberPosition(true);
  const startAt = resumePosition(item);
  lastSavedPosition = startAt;
  publish({
    item,
    queue,
    isPlaying: false,
    isLoading: true,
    positionSeconds: startAt,
    error: null,
  });
  engine.play(item, startAt);
}

export function togglePlayback() {
  if (!nowPlaying.item) return;
  if (nowPlaying.isPlaying) engine.pause();
  else engine.resume();
}

export function seekPlayback(seconds: number) {
  engine.seek(seconds);
  rememberPosition(true);
}

export const nextInQueue = (queue: MediaItem[], current: MediaItem, step: number) =>
  queue[queue.findIndex((item) => item.id === current.id) + step];

export function skip(step: 1 | -1) {
  const { item, queue } = nowPlaying;
  if (!item) return;
  const next = nextInQueue(queue, item, step);
  if (next) playItem(next, queue);
  else {
    if (step === 1) engine.pause();
    seekPlayback(0);
  }
}

export function stopPlayback() {
  rememberPosition(true);
  engine.stop();
  nowPlaying = idle;
  listeners.forEach((listener) => listener());
}

// For apps whose sound must not outlive their screen. Anything else playing is left alone.
export function stopItem(id: string) {
  if (nowPlaying.item?.id === id) stopPlayback();
}

export const setPlaybackVolume = (volume: number) => engine.setVolume(volume);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNowPlaying = (): NowPlaying => useSyncExternalStore(subscribe, () => nowPlaying);

// Tests start each case with nothing playing and from what is in storage.
export function resetMediaLibrary() {
  engine.stop();
  engine = createPreviewEngine(reportPlayback);
  nowPlaying = idle;
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
