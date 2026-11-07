import { vi } from 'vitest';
import {
  createPlayerState,
  createTimelineStore,
  mediaErrorMessage,
  playbackReducer,
  playRejectionMessage,
  progressFraction,
  RESTART_THRESHOLD_SECONDS,
  shouldRestart,
  type Playback,
  type PlaybackAction,
  type PlayerState,
} from './playback';

const stateWith = (playback: Playback, trackCount = 3): PlayerState => ({
  ...createPlayerState(playback.track, trackCount),
  playback,
});

const run = (state: PlayerState, ...actions: PlaybackAction[]) =>
  actions.reduce(playbackReducer, state);

describe('playbackReducer', () => {
  it('starts idle on the chosen track without asking to play', () => {
    const state = createPlayerState(2, 3);
    expect(state.playback).toEqual({ status: 'idle', track: 2 });
    expect(state.load).toEqual({ track: 2, autoplay: false });
  });

  it('only reports playing once the element does', () => {
    const asked = run(createPlayerState(0, 3), { type: 'transport/play' });
    expect(asked.playback.status).toBe('loading');
    expect(run(asked, { type: 'media/playing' }).playback.status).toBe('playing');
  });

  it('does not ask for a new load to resume the same track', () => {
    const paused = stateWith({ status: 'paused', track: 1 });
    expect(run(paused, { type: 'transport/play' }).load).toBe(paused.load);
  });

  it('reports paused from the pause event while playing or loading', () => {
    expect(
      run(stateWith({ status: 'playing', track: 1 }), { type: 'media/pause' }).playback,
    ).toEqual({ status: 'paused', track: 1 });
    expect(
      run(stateWith({ status: 'loading', track: 1 }), { type: 'media/pause' }).playback,
    ).toEqual({ status: 'paused', track: 1 });
  });

  it('keeps an error on screen when a pause event follows it', () => {
    const failed = stateWith({ status: 'error', track: 1, message: 'Nope' });
    expect(run(failed, { type: 'media/pause' })).toBe(failed);
  });

  it('shows buffering on waiting, and only while playing', () => {
    expect(
      run(stateWith({ status: 'playing', track: 1 }), { type: 'media/waiting' }).playback.status,
    ).toBe('loading');
    const paused = stateWith({ status: 'paused', track: 1 });
    expect(run(paused, { type: 'media/waiting' })).toBe(paused);
  });

  it('recovers from buffering when the element plays again', () => {
    const state = run(
      stateWith({ status: 'playing', track: 1 }),
      { type: 'media/waiting' },
      { type: 'media/playing' },
    );
    expect(state.playback).toEqual({ status: 'playing', track: 1 });
  });

  it.each(['playing', 'loading'] as const)('keeps playing across next from %s', (status) => {
    const state = run(stateWith({ status, track: 0 }), { type: 'transport/next' });
    expect(state.playback).toEqual({ status: 'loading', track: 1 });
    expect(state.load).toEqual({ track: 1, autoplay: true });
  });

  it.each(['idle', 'paused'] as const)('stays silent on next from %s', (status) => {
    const state = run(stateWith({ status, track: 0 }), { type: 'transport/next' });
    expect(state.playback).toEqual({ status: 'idle', track: 1 });
    expect(state.load).toEqual({ track: 1, autoplay: false });
  });

  it('wraps next and previous around the track list', () => {
    expect(
      run(stateWith({ status: 'paused', track: 2 }), { type: 'transport/next' }).playback.track,
    ).toBe(0);
    expect(
      run(stateWith({ status: 'paused', track: 0 }), { type: 'transport/previous' }).playback.track,
    ).toBe(2);
  });

  it('advances and keeps playing on ended, wrapping at the end of the list', () => {
    const state = run(stateWith({ status: 'playing', track: 2 }), { type: 'media/ended' });
    expect(state.playback).toEqual({ status: 'loading', track: 0 });
    expect(state.load).toEqual({ track: 0, autoplay: true });
  });

  it('requests a fresh load on ended even with one track', () => {
    const before = stateWith({ status: 'playing', track: 0 }, 1);
    const after = run(before, { type: 'media/ended' });
    expect(after.playback.track).toBe(0);
    expect(after.load).not.toBe(before.load);
  });

  it('shows an error, keeping the first message', () => {
    const state = run(
      stateWith({ status: 'loading', track: 1 }),
      { type: 'media/error', message: 'First' },
      { type: 'media/error', message: 'Second' },
    );
    expect(state.playback).toEqual({ status: 'error', track: 1, message: 'First' });
  });

  it('reloads the same track on retry', () => {
    const failed = stateWith({ status: 'error', track: 1, message: 'Nope' });
    const state = run(failed, { type: 'transport/retry' });
    expect(state.playback).toEqual({ status: 'loading', track: 1 });
    expect(state.load).toEqual({ track: 1, autoplay: true });
    expect(state.load).not.toBe(failed.load);
  });

  it('tries to play the next track after an error', () => {
    const failed = stateWith({ status: 'error', track: 1, message: 'Nope' });
    expect(run(failed, { type: 'transport/next' }).load).toEqual({ track: 2, autoplay: true });
  });

  it('does not mutate the previous state', () => {
    const state = Object.freeze(stateWith({ status: 'playing', track: 0 }));
    expect(() => run(state, { type: 'transport/next' }, { type: 'media/ended' })).not.toThrow();
    expect(state.playback).toEqual({ status: 'playing', track: 0 });
  });
});

describe('shouldRestart', () => {
  it('restarts past the threshold and goes back at or before it', () => {
    expect(shouldRestart(RESTART_THRESHOLD_SECONDS + 0.1)).toBe(true);
    expect(shouldRestart(RESTART_THRESHOLD_SECONDS)).toBe(false);
    expect(shouldRestart(0)).toBe(false);
  });
});

describe('playRejectionMessage', () => {
  it('ignores an AbortError, which only means the request was replaced', () => {
    expect(playRejectionMessage(new DOMException('replaced', 'AbortError'))).toBeNull();
  });

  it('says when the browser blocked playback', () => {
    expect(playRejectionMessage(new DOMException('no', 'NotAllowedError'))).toMatch(/blocked/i);
  });

  it('falls back to a general message for anything else', () => {
    expect(playRejectionMessage(new Error('boom'))).toMatch(/failed/i);
    expect(playRejectionMessage(undefined)).toMatch(/failed/i);
  });
});

describe('mediaErrorMessage', () => {
  it('describes each kind of failure and always offers a retry', () => {
    const messages = [2, 3, 4].map((code) => mediaErrorMessage({ code } as MediaError));
    expect(new Set(messages).size).toBe(3);
    [...messages, mediaErrorMessage(null)].forEach((message) => expect(message).toMatch(/retry/i));
  });
});

describe('progressFraction', () => {
  it('is 0 rather than NaN before the duration is known', () => {
    expect(progressFraction({ position: 0, duration: 0 })).toBe(0);
    expect(progressFraction({ position: 5, duration: 0 })).toBe(0);
  });

  it('is the share of the track played, clamped to the bar', () => {
    expect(progressFraction({ position: 15, duration: 60 })).toBe(0.25);
    expect(progressFraction({ position: 90, duration: 60 })).toBe(1);
  });
});

describe('createTimelineStore', () => {
  it('turns an unknown duration into 0', () => {
    const store = createTimelineStore();
    store.set(3, NaN);
    expect(store.getSnapshot()).toEqual({ position: 3, duration: 0 });
    store.set(3, Infinity);
    expect(store.getSnapshot()).toEqual({ position: 3, duration: 0 });
  });

  it('notifies subscribers of changes only, and stops after unsubscribing', () => {
    const store = createTimelineStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1, 10);
    const snapshot = store.getSnapshot();
    store.set(1, 10);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(snapshot);

    unsubscribe();
    store.set(2, 10);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
