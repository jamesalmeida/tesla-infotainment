import { useEffect, useRef } from 'react';
import {
  formatMediaTime,
  playItem,
  seekPlayback,
  stopItem,
  togglePlayback,
  useNowPlaying,
  type MediaItem,
} from '../../../apps/mediaLibrary';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import {
  activeLineIndex,
  encodeWav,
  lineProgress,
  LYRICS,
  renderSong,
  secondsUntilFirstLine,
  SONG,
  SONG_SECONDS,
} from './song';
import styles from './Caraoke.module.css';

const SAMPLE_RATE = 22050;

// Rendered on first play rather than on open, as it is a few megabytes of samples.
function createTrackUrl(): string {
  const wav = encodeWav(renderSong(SAMPLE_RATE), SAMPLE_RATE);
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
}

export const Caraoke = () => {
  const { item, isPlaying, isLoading, positionSeconds, error } = useNowPlaying();
  const urlRef = useRef<string | null>(null);

  const isActive = item?.id === SONG.id;
  const seconds = isActive ? positionSeconds : 0;
  const lineIndex = activeLineIndex(LYRICS, seconds);
  const line = LYRICS[lineIndex];
  const nextLine = LYRICS[lineIndex + 1];
  const countdown = Math.ceil(secondsUntilFirstLine(LYRICS, seconds));

  // The song belongs to this screen, so it stops with it, including when leaving Park.
  useEffect(
    () => () => {
      stopItem(SONG.id);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = () => {
    urlRef.current ??= createTrackUrl();
    const track: MediaItem = {
      ...SONG,
      collectionId: 'caraoke',
      durationSeconds: SONG_SECONDS,
      streamUrl: urlRef.current,
    };
    playItem(track);
  };

  return (
    <AppScreen
      title="Caraoke"
      fixed
      toolbar={<span className={ui.muted}>{`${SONG.title} · ${SONG.subtitle}`}</span>}
    >
      <div className={styles.stage}>
        {error && <Callout tone="error">{error}</Callout>}
        <div className={styles.lyrics} aria-live="off">
          {line ? (
            <p
              className={styles.current}
              style={{ '--sung': `${lineProgress(line, seconds) * 100}%` } as React.CSSProperties}
            >
              {line.text}
            </p>
          ) : (
            <p className={styles.current}>
              {isActive ? `Get ready… ${countdown}` : 'Press Sing to start'}
            </p>
          )}
          {(nextLine ?? (!line && LYRICS[0])) && (
            <p className={styles.next}>{(nextLine ?? LYRICS[0]).text}</p>
          )}
        </div>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={`${ui.button} ${ui.primary}`}
          disabled={isLoading}
          onClick={isActive ? togglePlayback : start}
        >
          {isActive && isPlaying ? 'Pause' : isActive ? 'Resume' : 'Sing'}
        </button>
        <input
          className={ui.range}
          type="range"
          aria-label="Song position"
          min={0}
          max={SONG_SECONDS}
          step={1}
          disabled={!isActive}
          value={Math.min(seconds, SONG_SECONDS)}
          onChange={(event) => seekPlayback(Number(event.target.value))}
        />
        <span className={styles.time}>
          {formatMediaTime(seconds)} / {formatMediaTime(SONG_SECONDS)}
        </span>
      </div>
    </AppScreen>
  );
};
