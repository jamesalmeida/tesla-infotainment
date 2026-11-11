import { memo, useState } from 'react';
import {
  skip,
  togglePlayback,
  useNowPlayingValue,
  type MediaSourceId,
} from '../../apps/mediaLibrary';
import { MediaArt } from '../../apps/ui/MediaArt';
import { FullMediaPlayer, type PlayerTab } from '../FullMediaPlayer/FullMediaPlayer';
import { getImagePath } from '../../utils/assetPaths';
import { ProgressBar } from './ProgressBar';
import styles from './MusicPanel.module.css';

// The small grey mark before the second line, saying where the audio comes from. Podcasts keep
// the card's original Bluetooth mark; the others are drawn to match it. A new source only needs
// an entry here.
const SOURCE_MARKS: Record<MediaSourceId, { label: string; image?: string; path?: string }> = {
  podcasts: { label: 'Bluetooth', image: 'icon-music-bluetooth.svg' },
  radio: {
    label: 'Radio',
    path: 'M12 11v9M8.5 7.5a5 5 0 0 1 7 0M5.7 4.7a9 9 0 0 1 12.6 0M10.6 9.4a2 2 0 0 1 2.8 0',
  },
  music: {
    label: 'Music',
    path: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm11-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
  },
};

function SourceMark({ source }: { source: MediaSourceId }) {
  const mark = SOURCE_MARKS[source];
  if (mark.image) {
    return <img className={styles.sourceIcon} src={getImagePath(mark.image)} alt={mark.label} />;
  }
  return (
    <svg
      className={`${styles.sourceIcon} ${styles.sourceGlyph}`}
      viewBox="0 0 24 24"
      role="img"
      aria-label={mark.label}
    >
      <path d={mark.path} />
    </svg>
  );
}

function EmptyArt() {
  return (
    <div className={styles.artPlaceholder} role="img" aria-label="No album art">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
      </svg>
    </div>
  );
}

interface MusicPanelProps {
  // Kept for the callers that pass it; the player itself follows the car's volume.
  volume?: number;
  onOpenAudioSettings?: () => void;
}

/**
 * The media card. It plays nothing itself: it shows whatever the shared player has, from any
 * app (Podcasts, Radio, Music, and whatever comes next), and its buttons drive that player.
 */
export const MusicPanel = memo(function MusicPanel({ onOpenAudioSettings }: MusicPanelProps) {
  const item = useNowPlayingValue((now) => now.item);
  const isPlaying = useNowPlayingValue((now) => now.isPlaying);
  const isBuffering = useNowPlayingValue((now) => now.isLoading);
  const error = useNowPlayingValue((now) => now.error);
  const [playerTab, setPlayerTab] = useState<PlayerTab | null>(null);
  const showPause = isPlaying || isBuffering;

  return (
    <>
      <div className={styles.musicPanel}>
        <div className={styles.albumArt}>
          {item ? (
            <MediaArt key={item.id} artworkUrl={item.artworkUrl} seed={item.collectionId} />
          ) : (
            <EmptyArt />
          )}
        </div>
        <div className={styles.musicText}>
          <div className={styles.title}>{item?.title ?? 'Nothing playing'}</div>
          <SourceMark source={item?.sourceId ?? 'podcasts'} />
          {error ? (
            <div className={`${styles.albumTitle} ${styles.errorText}`} role="alert">
              {error}
            </div>
          ) : (
            <div className={styles.albumTitle}>{item?.subtitle ?? 'Choose something to play'}</div>
          )}
        </div>
        <ProgressBar />
        <div className={styles.musicBtnBar}>
          <button className={styles.musicBtn} onClick={() => skip(-1)}>
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath('icon-music-previous.svg')}
              alt="Previous Track"
            />
          </button>
          <button
            className={`${styles.musicBtn} ${isBuffering ? styles.buffering : ''}`}
            onClick={togglePlayback}
            aria-busy={isBuffering}
          >
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath(showPause ? 'icon-music-pause.svg' : 'icon-music-play.svg')}
              alt={showPause ? 'Pause' : 'Play'}
            />
          </button>
          <button className={styles.musicBtn} onClick={() => skip(1)}>
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath('icon-music-next.svg')}
              alt="Next Track"
            />
          </button>
          <button
            className={styles.musicBtn}
            aria-label="Audio settings"
            onClick={onOpenAudioSettings}
          >
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath('icon-settings.svg')}
              alt="Settings"
            />
          </button>
          <button
            className={styles.musicBtn}
            aria-label="Search media"
            onClick={() => setPlayerTab('search')}
          >
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath('icon-search.svg')}
              alt="Search"
            />
          </button>
          <button
            className={styles.musicBtn}
            aria-label="Open full media player"
            onClick={() => setPlayerTab('browse')}
          >
            <svg className={styles.musicIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        </div>
      </div>
      {playerTab && <FullMediaPlayer initialTab={playerTab} onClose={() => setPlayerTab(null)} />}
    </>
  );
});
