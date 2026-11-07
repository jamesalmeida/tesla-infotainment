import { memo, useEffect, useState } from 'react';
import { pauseLibraryPlayback } from '../../apps/mediaLibrary';
import { setMediaTransport } from '../../state/mediaTransport';
import { FullMediaPlayer, type PlayerTab } from '../FullMediaPlayer/FullMediaPlayer';
import { getImagePath } from '../../utils/assetPaths';
import { ProgressBar } from './ProgressBar';
import { usePlayback } from './usePlayback';
import styles from './MusicPanel.module.css';

const tracks = [
  {
    title: '#440 - Pieter Levels: Programming, Viral Al Startups, and Digital Nomad Life',
    album: 'Lex Fridman Podcast',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/3e/e3/9c/3ee39c89-de08-47a6-7f3d-3849cef6d255/mza_16657851278549137484.png/600x600bb.webp',
    // audio: "/audio/podcasts/lex_fridman_440_ai_pieter_levels.mp3"
    audio: 'https://content.blubrry.com/takeituneasy/lex_ai_pieter_levels.mp3',
  },
  {
    title: '#438 – Elon Musk: Neuralink and the Future of Humanity',
    album: 'Lex Fridman Podcast',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/3e/e3/9c/3ee39c89-de08-47a6-7f3d-3849cef6d255/mza_16657851278549137484.png/600x600bb.webp',
    audio: 'https://content.blubrry.com/takeituneasy/lex_ai_elon_musk_and_neuralink_team.mp3',
  },
  {
    title: 'SEP 5 - S01E77 - The Road to Autonomous Intelligence with Andrej Karpathy',
    album: 'No Priors Podcast',
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts122/v4/a6/4d/9c/a64d9c5a-2ca4-6a1b-3ceb-424efe00d022/mza_1247466525586262525.jpg/600x600bb.webp',
    audio:
      'https://dcs-spotify.megaphone.fm/PDP5840775995.mp3?key=ddb7f40d09aa7f54678599bee8fe8735&request_event_id=db0b2f9d-9700-4f1d-9a84-163472e7824c&timetoken=1726938704_F98B8D0954A9F5A6E4C44CD6BC70A492',
  },
  // Add more tracks here
];

const audioUrls = tracks.map((track) => track.audio);

const chooseRandomTrack = () => Math.floor(Math.random() * tracks.length);

function AlbumArt({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.artPlaceholder} role="img" aria-label="No album art">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" />
        </svg>
      </div>
    );
  }
  return <img alt="" src={src} onError={() => setFailed(true)} />;
}

interface MusicPanelProps {
  volume: number;
  // Optional, so the player can be tested without the car store.
  onOpenAudioSettings?: () => void;
}

export const MusicPanel = memo(function MusicPanel({
  volume,
  onOpenAudioSettings,
}: MusicPanelProps) {
  const { playback, timeline, togglePlayPause, play, pause, next, previous, seek } = usePlayback(
    audioUrls,
    chooseRandomTrack,
    volume,
  );
  const [playerTab, setPlayerTab] = useState<PlayerTab | null>(null);
  const track = tracks[playback.track];
  const isBuffering = playback.status === 'loading';
  const showPause = playback.status === 'playing' || isBuffering;

  // Keyboard shortcuts, kept apart from playback: these move to a shared handler.
  // Lets the shortcut table and other apps drive the player without owning it.
  useEffect(() => {
    setMediaTransport({
      togglePlayPause,
      play,
      pause,
      next,
      previous,
      isPlaying: () => playback.status === 'playing',
    });
    return () => setMediaTransport(null);
  }, [togglePlayPause, play, pause, next, previous, playback.status]);

  // One source at a time: starting this player pauses anything from the media apps.
  useEffect(() => {
    if (playback.status === 'playing') pauseLibraryPlayback();
  }, [playback.status]);

  return (
    <>
      <div className={styles.musicPanel}>
        <div className={styles.albumArt}>
          <AlbumArt key={track.art} src={track.art} />
        </div>
        <div className={styles.musicText}>
          <div className={styles.title}>{track.title}</div>
          <img
            className={styles.sourceIcon}
            src={getImagePath('icon-music-bluetooth.svg')}
            alt="Bluetooth"
          />
          {playback.status === 'error' ? (
            <div className={`${styles.albumTitle} ${styles.errorText}`} role="alert">
              {playback.message}
            </div>
          ) : (
            <div className={styles.albumTitle}>{track.album}</div>
          )}
        </div>
        <ProgressBar timeline={timeline} onSeek={seek} />
        <div className={styles.musicBtnBar}>
          <button className={styles.musicBtn} onClick={previous}>
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath('icon-music-previous.svg')}
              alt="Previous Track"
            />
          </button>
          <button
            className={`${styles.musicBtn} ${isBuffering ? styles.buffering : ''}`}
            onClick={togglePlayPause}
            aria-busy={isBuffering}
          >
            <img
              className={`${styles.musicIcon} ctaBtn`}
              src={getImagePath(showPause ? 'icon-music-pause.svg' : 'icon-music-play.svg')}
              alt={showPause ? 'Pause' : 'Play'}
            />
          </button>
          <button className={styles.musicBtn} onClick={next}>
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
