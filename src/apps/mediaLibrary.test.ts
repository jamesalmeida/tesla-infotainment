import { act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  connectPlayback,
  formatMediaTime,
  getMediaSource,
  nextInQueue,
  parsePositions,
  playItem,
  resetMediaLibrary,
  resumePosition,
  seekPlayback,
  setMediaSource,
  skip,
  stopPlayback,
  togglePlayback,
  updatePosition,
  useNowPlaying,
  type MediaItem,
  type PlaybackEngine,
  type PlaybackReport,
} from './mediaLibrary';
import { renderHook } from '@testing-library/react';

const episode: MediaItem = {
  id: 'ep',
  title: 'Episode',
  subtitle: 'Show',
  collectionId: 'show',
  durationSeconds: 600,
  resumable: true,
};
const song: MediaItem = { ...episode, id: 'song', durationSeconds: 3, resumable: false };

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

afterEach(() => {
  vi.useRealTimers();
});

test('positions are kept per episode and forgotten once finished', () => {
  const saved = updatePosition({ other: 5 }, episode, 120);
  expect(saved).toEqual({ other: 5, ep: 120 });
  expect(updatePosition(saved, episode, 590)).toEqual({ other: 5 });
});

test('stored positions are validated', () => {
  expect(parsePositions('{bad')).toEqual({});
  expect(parsePositions('[1]')).toEqual({});
  expect(parsePositions('{"a":12,"b":"x","c":-1}')).toEqual({ a: 12 });
});

test('times read naturally with and without hours', () => {
  expect(formatMediaTime(65)).toBe('1:05');
  expect(formatMediaTime(3725)).toBe('1:02:05');
});

test('the next item comes from the queue, and Next wraps around it', () => {
  expect(nextInQueue([song, episode], song, 1)).toBe(episode);
  expect(nextInQueue([song, episode], episode, 1)).toBe(song);
  expect(nextInQueue([song, episode], song, -1)).toBe(episode);
  expect(nextInQueue([], song, 1)).toBeUndefined();
});

test('an episode resumes from where it stopped, across visits', () => {
  vi.useFakeTimers();
  playItem(episode);
  vi.advanceTimersByTime(1000);
  seekPlayback(200);
  stopPlayback();

  resetMediaLibrary();
  expect(resumePosition(episode)).toBe(200);
  expect(resumePosition(song)).toBe(0);
});

test('sample content moves along by the clock and advances the queue', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useNowPlaying());
  act(() => playItem(song, [song, episode]));
  expect(result.current.isPlaying).toBe(true);

  act(() => {
    vi.advanceTimersByTime(3500);
  });

  expect(result.current.item?.id).toBe('ep');
});

test('playback stops after the last item rather than starting over', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useNowPlaying());
  act(() => playItem(song));
  act(() => {
    vi.advanceTimersByTime(3500);
  });
  expect(result.current.isPlaying).toBe(false);
});

test('pausing stops the clock and resuming restarts it', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useNowPlaying());
  act(() => playItem(episode));
  act(() => togglePlayback());
  const paused = result.current.positionSeconds;
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(result.current.positionSeconds).toBe(paused);

  act(() => togglePlayback());
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(result.current.positionSeconds).toBeGreaterThan(paused);
});

test('previous at the start of the queue goes back to the top of the item', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useNowPlaying());
  act(() => playItem(episode));
  act(() => seekPlayback(90));
  act(() => skip(-1));
  expect(result.current.positionSeconds).toBe(0);
});

test('a connected engine takes over and reports back', () => {
  let report: (report: PlaybackReport) => void = () => {};
  const engine: PlaybackEngine = {
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(),
    setVolume: vi.fn(),
    loadedId: vi.fn(() => null),
  };
  connectPlayback((reportPlayback) => {
    report = reportPlayback;
    return engine;
  });
  const { result } = renderHook(() => useNowPlaying());

  act(() => playItem(episode));
  expect(engine.play).toHaveBeenCalledWith(episode, 0);
  expect(result.current.isLoading).toBe(true);

  act(() => report({ type: 'playing' }));
  act(() => report({ type: 'position', seconds: 42 }));
  expect(result.current).toMatchObject({ isPlaying: true, positionSeconds: 42 });

  act(() => report({ type: 'failed', message: 'No signal' }));
  expect(result.current).toMatchObject({ isPlaying: false, error: 'No signal' });
});

test('a catalogue can be replaced without touching the screens', async () => {
  const original = getMediaSource('music');
  setMediaSource('music', { browse: () => Promise.resolve([]) });
  await expect(getMediaSource('music').browse()).resolves.toEqual([]);
  setMediaSource('music', original);
  await expect(getMediaSource('music').browse()).resolves.not.toEqual([]);
});

test('every source plays through one player: the last one started is what is playing', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useNowPlaying());
  const station: MediaItem = {
    id: 'radio-1',
    title: 'Station',
    subtitle: 'Somewhere',
    collectionId: 'radio-1',
    durationSeconds: null,
    live: true,
    sourceId: 'radio',
  };

  act(() => playItem(episode, [episode]));
  act(() => playItem(station, [station]));

  expect(result.current.item?.id).toBe('radio-1');
  expect(result.current.isPlaying).toBe(true);
  // A live stream has no position to seek or to remember.
  act(() => seekPlayback(30));
  expect(result.current.positionSeconds).toBe(0);
});

test('the player starts with a featured episode cued, without loading anything', () => {
  resetMediaLibrary({ cue: true });
  const { result } = renderHook(() => useNowPlaying());
  expect(result.current.item?.sourceId).toBe('podcasts');
  expect(result.current.item?.streamUrl).toMatch(/^https:\/\//);
  expect(result.current.isPlaying).toBe(false);
  expect(result.current.isLoading).toBe(false);
});
