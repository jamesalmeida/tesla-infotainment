// The music player's state machine, kept free of React and of the audio element
// so every transition can be tested on its own. usePlayback connects it to both.

/**
 * What the audio element is doing. `playing` and `paused` are only ever entered
 * from media events, so they report the element rather than what was asked of it.
 *
 * `idle` means a track is selected but nothing has been requested for it. The
 * element uses preload="none", so a load only ever starts when playback was asked
 * for, which is why `loading` has no separate "and then autoplay" flag.
 */
export type Playback =
  | { status: 'idle'; track: number }
  | { status: 'loading'; track: number }
  | { status: 'playing'; track: number }
  | { status: 'paused'; track: number }
  | { status: 'error'; track: number; message: string };

/** A request to point the element at a track. A new object means a new load. */
export interface Load {
  track: number;
  autoplay: boolean;
}

export interface PlayerState {
  playback: Playback;
  load: Load;
  trackCount: number;
}

export type PlaybackAction =
  | { type: 'transport/play' }
  | { type: 'transport/retry' }
  | { type: 'transport/next' }
  | { type: 'transport/previous' }
  | { type: 'media/playing' }
  | { type: 'media/pause' }
  | { type: 'media/waiting' }
  | { type: 'media/ended' }
  | { type: 'media/error'; message: string };

export const createPlayerState = (track: number, trackCount: number): PlayerState => ({
  playback: { status: 'idle', track },
  load: { track, autoplay: false },
  trackCount,
});

const goToTrack = (state: PlayerState, track: number, autoplay: boolean): PlayerState => ({
  ...state,
  playback: { status: autoplay ? 'loading' : 'idle', track },
  load: { track, autoplay },
});

// Changing track keeps playing if the listener was playing. An error only ever
// follows a request to play, so it counts too.
const wantsSound = ({ status }: Playback) =>
  status === 'playing' || status === 'loading' || status === 'error';

const wrap = (index: number, count: number) => (index + count) % count;

export function playbackReducer(state: PlayerState, action: PlaybackAction): PlayerState {
  const { playback, trackCount } = state;
  const { track } = playback;

  switch (action.type) {
    case 'transport/play':
      return { ...state, playback: { status: 'loading', track } };
    case 'transport/retry':
      return goToTrack(state, track, true);
    case 'transport/next':
      return goToTrack(state, wrap(track + 1, trackCount), wantsSound(playback));
    case 'transport/previous':
      return goToTrack(state, wrap(track - 1, trackCount), wantsSound(playback));
    case 'media/playing':
      return { ...state, playback: { status: 'playing', track } };
    case 'media/pause':
      return playback.status === 'playing' || playback.status === 'loading'
        ? { ...state, playback: { status: 'paused', track } }
        : state;
    case 'media/waiting':
      return playback.status === 'playing'
        ? { ...state, playback: { status: 'loading', track } }
        : state;
    case 'media/ended':
      return goToTrack(state, wrap(track + 1, trackCount), true);
    case 'media/error':
      // A failed load reports through both `error` and the play() promise.
      return playback.status === 'error'
        ? state
        : { ...state, playback: { status: 'error', track, message: action.message } };
  }
}

/** How far into a track the previous button restarts it instead of going back. */
export const RESTART_THRESHOLD_SECONDS = 3;

export const shouldRestart = (position: number) => position > RESTART_THRESHOLD_SECONDS;

const RETRY_HINT = 'Tap play to retry.';

export function mediaErrorMessage(error: MediaError | null): string {
  switch (error?.code) {
    case 2: // MEDIA_ERR_NETWORK
      return `Network error. ${RETRY_HINT}`;
    case 3: // MEDIA_ERR_DECODE
      return `This track is damaged. ${RETRY_HINT}`;
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return `Track unavailable. ${RETRY_HINT}`;
    default:
      return `Playback failed. ${RETRY_HINT}`;
  }
}

/**
 * The message for a rejected play(), or null when the rejection is expected:
 * AbortError only means a pause or a new track replaced the request.
 */
export function playRejectionMessage(reason: unknown): string | null {
  const name = (reason as { name?: unknown } | null)?.name;
  if (name === 'AbortError') return null;
  if (name === 'NotAllowedError') return `Playback was blocked. ${RETRY_HINT}`;
  return `Playback failed. ${RETRY_HINT}`;
}

export interface Timeline {
  position: number;
  duration: number;
}

// Duration is NaN before metadata arrives and Infinity on a live stream.
const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0);

/**
 * Playback time, held outside React state so `timeupdate` only re-renders the
 * components subscribed to it (through useSyncExternalStore).
 */
export function createTimelineStore() {
  let snapshot: Timeline = { position: 0, duration: 0 };
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(position: number, duration: number) {
      const next = { position: finiteOrZero(position), duration: finiteOrZero(duration) };
      if (next.position === snapshot.position && next.duration === snapshot.duration) return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

export type TimelineStore = ReturnType<typeof createTimelineStore>;

export const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

/** Position as a 0 to 1 fraction, and 0 until the duration is known. */
export const progressFraction = ({ position, duration }: Timeline) =>
  duration > 0 ? clampFraction(position / duration) : 0;
