import {
  formatMediaTime,
  seekPlayback,
  skip,
  togglePlayback,
  useNowPlaying,
} from '../mediaLibrary';
import { ui } from './AppScreen';
import { GeneratedArt } from './GeneratedArt';
import styles from './NowPlayingBar.module.css';

// The transport shared by Music, Podcasts and Radio.
export function NowPlayingBar() {
  const { item, isPlaying, isLoading, positionSeconds } = useNowPlaying();
  if (!item) return null;

  const duration = item.durationSeconds;

  return (
    <section className={styles.bar} aria-label="Now playing">
      <GeneratedArt seed={item.collectionId} className={styles.art} />
      <div className={styles.text}>
        <div className={`${ui.strong} ${styles.line}`}>{item.title}</div>
        <div className={`${ui.muted} ${styles.line}`}>{item.subtitle}</div>
      </div>
      {duration !== null && (
        <div className={styles.progress}>
          <span className={styles.time}>{formatMediaTime(positionSeconds)}</span>
          <input
            className={ui.range}
            type="range"
            aria-label="Playback position"
            min={0}
            max={duration}
            step={1}
            value={Math.min(positionSeconds, duration)}
            onChange={(event) => seekPlayback(Number(event.target.value))}
          />
          <span className={styles.time}>{formatMediaTime(duration)}</span>
        </div>
      )}
      <div className={styles.buttons}>
        {duration !== null && (
          <button
            type="button"
            className={ui.button}
            aria-label="Previous"
            onClick={() => skip(-1)}
          >
            ‹‹
          </button>
        )}
        <button
          type="button"
          className={`${ui.button} ${ui.primary}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={isLoading}
          onClick={togglePlayback}
        >
          {isLoading ? '…' : isPlaying ? 'Pause' : 'Play'}
        </button>
        {duration !== null && (
          <button type="button" className={ui.button} aria-label="Next" onClick={() => skip(1)}>
            ››
          </button>
        )}
      </div>
    </section>
  );
}
