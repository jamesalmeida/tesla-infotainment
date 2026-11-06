import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  createPlayerState,
  createTimelineStore,
  mediaErrorMessage,
  playbackReducer,
  playRejectionMessage,
  shouldRestart,
} from './playback';

/**
 * Connects the playback reducer to a single audio element.
 *
 * `urls` must be stable across renders. Media events drive the reported status;
 * the controls only ask the element to act, and its events report what happened.
 */
export function usePlayback(urls: readonly string[], chooseTrack: () => number, volume: number) {
  const [{ playback, load }, dispatch] = useReducer(playbackReducer, undefined, () =>
    createPlayerState(chooseTrack(), urls.length),
  );
  const [timeline] = useState(createTimelineStore);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Only called from effects and event handlers, never while rendering. The ref
  // also outlives StrictMode's simulated remount, so that keeps the same element.
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }
    return audioRef.current;
  }, []);

  const startPlaying = useCallback((audio: HTMLAudioElement) => {
    audio.play().catch((reason: unknown) => {
      const message = playRejectionMessage(reason);
      if (message) dispatch({ type: 'media/error', message });
    });
  }, []);

  useEffect(() => {
    const audio = getAudio();

    const onPlaying = () => dispatch({ type: 'media/playing' });
    // The element pauses itself just before `ended`, which isn't a listener's pause.
    const onPause = () => {
      if (!audio.ended) dispatch({ type: 'media/pause' });
    };
    const onWaiting = () => dispatch({ type: 'media/waiting' });
    const onEnded = () => dispatch({ type: 'media/ended' });
    const onError = () =>
      dispatch({ type: 'media/error', message: mediaErrorMessage(audio.error) });
    const onTime = () => timeline.set(audio.currentTime, audio.duration);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onTime);

    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onTime);

      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [getAudio, timeline]);

  // The only place `src` is set. Assigning it also resets the position to 0.
  useEffect(() => {
    const audio = getAudio();
    audio.src = urls[load.track];
    timeline.set(0, 0);
    if (load.autoplay) startPlaying(audio);
  }, [load, urls, getAudio, startPlaying, timeline]);

  useEffect(() => {
    getAudio().volume = volume / 100;
  }, [volume, getAudio]);

  const failed = playback.status === 'error';
  const togglePlayPause = useCallback(() => {
    const audio = getAudio();
    if (failed) {
      dispatch({ type: 'transport/retry' });
    } else if (audio.paused) {
      dispatch({ type: 'transport/play' });
      startPlaying(audio);
    } else {
      audio.pause();
    }
  }, [failed, getAudio, startPlaying]);

  const seek = useCallback(
    (time: number) => {
      const audio = getAudio();
      if (audio.error) return;
      audio.currentTime = time;
      timeline.set(audio.currentTime, audio.duration);
    },
    [getAudio, timeline],
  );

  const next = useCallback(() => dispatch({ type: 'transport/next' }), []);

  const previous = useCallback(() => {
    const audio = getAudio();
    if (!audio.error && shouldRestart(audio.currentTime)) {
      seek(0);
    } else {
      dispatch({ type: 'transport/previous' });
    }
  }, [getAudio, seek]);

  return { playback, timeline, togglePlayPause, next, previous, seek };
}
