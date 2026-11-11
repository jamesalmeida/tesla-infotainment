import { useEffect, useRef, useState, type FormEvent } from 'react';
import YouTube from 'react-youtube';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { GeneratedArt } from '../../../apps/ui/GeneratedArt';
import {
  parseVideoId,
  PLACEHOLDER_SOURCES,
  PLAYER_TIMEOUT_MS,
  playerErrorMessage,
  VIDEOS,
  type PlaceholderSource,
} from './sources';
import styles from './Theater.module.css';

const PLAYER_OPTIONS = {
  width: '100%',
  height: '100%',
  host: 'https://www.youtube-nocookie.com',
  playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
};

const OFFLINE_MESSAGE = "You appear to be offline, so video can't load.";
const BLOCKED_MESSAGE =
  "The video player didn't load. Your network or a content blocker may be stopping it.";

function Player({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(() =>
    navigator.onLine === false ? OFFLINE_MESSAGE : null,
  );
  const [isReady, setIsReady] = useState(false);

  // A blocked player fails silently, so silence is what has to be timed.
  useEffect(() => {
    if (isReady) return;
    const timer = setTimeout(
      () => setError((current) => current ?? BLOCKED_MESSAGE),
      PLAYER_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [isReady]);

  useEffect(() => {
    const handleOffline = () => setError(OFFLINE_MESSAGE);
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const goFullScreen = () => {
    frameRef.current?.requestFullscreen?.().catch(() => {
      setError('This browser refused full screen. The video can keep playing here.');
    });
  };

  return (
    <div className={styles.player}>
      <div className={styles.playerBar}>
        <button type="button" className={ui.button} onClick={onClose}>
          ‹ Theater
        </button>
        <span className={`${ui.strong} ${styles.playerTitle}`}>{title}</span>
        <button type="button" className={ui.button} onClick={goFullScreen}>
          Full screen
        </button>
      </div>
      {error && <Callout tone="error">{error}</Callout>}
      <div ref={frameRef} className={styles.frame}>
        {navigator.onLine !== false && (
          <YouTube
            className={styles.embed}
            iframeClassName={styles.embed}
            videoId={videoId}
            title={title}
            opts={PLAYER_OPTIONS}
            onReady={() => setIsReady(true)}
            onError={(event: { data: number }) => setError(playerErrorMessage(event.data))}
          />
        )}
      </div>
    </div>
  );
}

export const Theater = () => {
  const [playing, setPlaying] = useState<{ id: string; title: string } | null>(null);
  const [placeholder, setPlaceholder] = useState<PlaceholderSource | null>(null);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);

  const handleLink = (event: FormEvent) => {
    event.preventDefault();
    const id = parseVideoId(link);
    setLinkError(id === null);
    if (id) setPlaying({ id, title: 'Your video' });
  };

  if (playing) {
    return (
      <AppScreen title="Theater" fixed>
        <Player
          key={playing.id}
          videoId={playing.id}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Theater">
      <div className={ui.stack}>
        {placeholder && (
          <Callout
            action={
              <button type="button" className={ui.button} onClick={() => setPlaceholder(null)}>
                Close
              </button>
            }
          >
            {placeholder.label} is a placeholder. This simulator has no streaming accounts, so there
            is nothing to sign in to.
          </Callout>
        )}
        <section aria-label="Sources">
          <h3 className={ui.sectionTitle}>Sources</h3>
          <div className={styles.grid}>
            {PLACEHOLDER_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                className={styles.source}
                onClick={() => setPlaceholder(source)}
              >
                {source.label}
              </button>
            ))}
          </div>
        </section>
        <section aria-label="Videos">
          <h3 className={ui.sectionTitle}>Open films</h3>
          <div className={styles.grid}>
            {VIDEOS.map((video) => (
              <button
                key={video.id}
                type="button"
                className={styles.video}
                onClick={() => setPlaying(video)}
              >
                <GeneratedArt seed={video.title} className={styles.art} />
                <span className={ui.strong}>{video.title}</span>
                <span className={ui.muted}>{video.note}</span>
              </button>
            ))}
          </div>
        </section>
        <form className={ui.inline} onSubmit={handleLink}>
          <input
            className={ui.input}
            aria-label="Video link"
            placeholder="Paste a YouTube link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
          />
          <button type="submit" className={ui.button}>
            Play
          </button>
        </form>
        {linkError && <Callout tone="warning">That doesn&apos;t look like a YouTube link.</Callout>}
        <p className={ui.muted}>Video plays in Park only, and stops when you shift out of it.</p>
      </div>
    </AppScreen>
  );
};
