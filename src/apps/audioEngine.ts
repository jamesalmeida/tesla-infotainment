import type { MediaItem } from './mediaLibrary';

// What the player reports back. Status only ever comes from the element's own events, so it
// always says what the audio is doing rather than what was asked of it.
export type PlaybackReport =
  | { type: 'position'; seconds: number }
  | { type: 'duration'; seconds: number | null }
  | { type: 'loading' }
  | { type: 'playing' }
  | { type: 'paused' }
  | { type: 'ended' }
  | { type: 'failed'; message: string };

export interface PlaybackEngine {
  // Loads an item and plays it from a position. A new item always starts a fresh load.
  play: (item: MediaItem, startAtSeconds: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  // The item the engine has loaded, if any. Cueing an item doesn't load it.
  loadedId: () => string | null;
}

const RETRY_HINT = 'Tap play to retry.';
const CLOCK_TICK_MS = 250;
// A dead stream can hang without ever raising an error.
const STREAM_TIMEOUT_MS = 12000;

export function mediaErrorMessage(error: MediaError | null): string {
  switch (error?.code) {
    case 2: // MEDIA_ERR_NETWORK
      return `Network error. ${RETRY_HINT}`;
    case 3: // MEDIA_ERR_DECODE
      return `This track is damaged. ${RETRY_HINT}`;
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return `This can't be played right now. ${RETRY_HINT}`;
    default:
      return `Playback failed. ${RETRY_HINT}`;
  }
}

// A rejected play() is only an error when it isn't simply a pause or a new item replacing it.
export function playRejectionMessage(reason: unknown): string | null {
  const name = (reason as { name?: unknown } | null)?.name;
  if (name === 'AbortError') return null;
  if (name === 'NotAllowedError') return `Playback was blocked. ${RETRY_HINT}`;
  return `Playback failed. ${RETRY_HINT}`;
}

// Duration is NaN before metadata arrives and Infinity on a live stream.
const knownDuration = (value: number): number | null =>
  Number.isFinite(value) && value > 0 ? value : null;

/**
 * The one player for everything: podcasts, radio, music and anything added later. It owns a
 * single audio element, created the first time something actually plays and with preload
 * off, so nothing downloads until the listener asks. Items with no audio behind them, such as
 * the invented samples, move along on a silent clock instead.
 */
export function createAudioEngine(report: (report: PlaybackReport) => void): PlaybackEngine {
  let audio: HTMLAudioElement | null = null;
  let loaded: MediaItem | null = null;
  let volume = 0.5;
  let pendingSeek: number | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  let clock: ReturnType<typeof setInterval> | undefined;
  let clockPosition = 0;

  const stopClock = () => clearInterval(clock);

  const startClock = () => {
    stopClock();
    let last = Date.now();
    clock = setInterval(() => {
      const now = Date.now();
      clockPosition += (now - last) / 1000;
      last = now;
      const duration = loaded?.durationSeconds ?? null;
      if (duration !== null && clockPosition >= duration) {
        stopClock();
        report({ type: 'ended' });
      } else {
        report({ type: 'position', seconds: clockPosition });
      }
    }, CLOCK_TICK_MS);
  };

  const getAudio = (): HTMLAudioElement => {
    if (audio) return audio;
    const element = new Audio();
    element.preload = 'none';
    element.volume = volume;
    element.addEventListener('playing', () => {
      clearTimeout(loadTimer);
      report({ type: 'playing' });
    });
    // The element pauses itself just before `ended`, which isn't a listener's pause.
    element.addEventListener('pause', () => {
      if (!element.ended) report({ type: 'paused' });
    });
    element.addEventListener('waiting', () => report({ type: 'loading' }));
    element.addEventListener('ended', () => report({ type: 'ended' }));
    element.addEventListener('error', () => {
      clearTimeout(loadTimer);
      // Clearing the source on stop raises an error that isn't a failure.
      if (!element.src) return;
      report({ type: 'failed', message: mediaErrorMessage(element.error) });
    });
    element.addEventListener('timeupdate', () =>
      report({ type: 'position', seconds: element.currentTime }),
    );
    const onDuration = () => report({ type: 'duration', seconds: knownDuration(element.duration) });
    element.addEventListener('durationchange', onDuration);
    element.addEventListener('loadedmetadata', () => {
      onDuration();
      if (pendingSeek !== null) {
        element.currentTime = pendingSeek;
        pendingSeek = null;
      }
    });
    audio = element;
    return element;
  };

  const startAudio = (element: HTMLAudioElement) => {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(
      () => report({ type: 'failed', message: mediaErrorMessage(null) }),
      STREAM_TIMEOUT_MS,
    );
    element.play().catch((reason: unknown) => {
      clearTimeout(loadTimer);
      const message = playRejectionMessage(reason);
      if (message) report({ type: 'failed', message });
    });
  };

  return {
    play(item, startAtSeconds) {
      stopClock();
      clearTimeout(loadTimer);
      loaded = item;
      report({ type: 'duration', seconds: item.durationSeconds });

      if (!item.streamUrl) {
        audio?.pause();
        clockPosition = startAtSeconds;
        report({ type: 'position', seconds: startAtSeconds });
        startClock();
        report({ type: 'playing' });
        return;
      }

      const element = getAudio();
      // The only place a source is set, so pausing and resuming never reloads the file.
      element.src = item.streamUrl;
      pendingSeek = startAtSeconds > 0 ? startAtSeconds : null;
      report({ type: 'position', seconds: startAtSeconds });
      report({ type: 'loading' });
      startAudio(element);
    },
    pause() {
      if (!loaded) return;
      if (loaded.streamUrl) {
        clearTimeout(loadTimer);
        audio?.pause();
      } else {
        stopClock();
        report({ type: 'paused' });
      }
    },
    resume() {
      if (!loaded) return;
      if (loaded.streamUrl && audio) {
        report({ type: 'loading' });
        startAudio(audio);
      } else {
        startClock();
        report({ type: 'playing' });
      }
    },
    seek(seconds) {
      if (loaded?.streamUrl && audio) {
        if (audio.error) return;
        audio.currentTime = seconds;
      } else {
        clockPosition = seconds;
      }
      report({ type: 'position', seconds });
    },
    stop() {
      stopClock();
      clearTimeout(loadTimer);
      loaded = null;
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
    setVolume(next) {
      volume = Math.max(0, Math.min(1, next / 100));
      if (audio) audio.volume = volume;
    },
    loadedId: () => loaded?.id ?? null,
  };
}
