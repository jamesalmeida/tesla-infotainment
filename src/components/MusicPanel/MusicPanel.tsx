import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { getImagePath } from '../../utils/assetPaths';
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

const getRandomIndex = (max: number) => Math.floor(Math.random() * max);

export function MusicPanel({ volume }: { volume: number }) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => getRandomIndex(tracks.length));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio(tracks[currentTrackIndex].audio));
  const lastTapTimeRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef(0);

  const updateProgress = () => {
    currentTimeRef.current = audioRef.current.currentTime;
    setCurrentTime(currentTimeRef.current);
  };

  useEffect(() => {
    const audio = audioRef.current;
    audio.addEventListener('timeupdate', updateProgress);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener('loadedmetadata', updateDuration);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  useEffect(() => {
    audioRef.current.src = tracks[currentTrackIndex].audio;
    if (isPlaying) {
      audioRef.current.play().catch((error) => console.error('Playback failed:', error));
    } else {
      audioRef.current.pause();
    }
    audioRef.current.currentTime = currentTimeRef.current;
  }, [currentTrackIndex, isPlaying]);

  useEffect(() => {
    audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prevIsPlaying) => !prevIsPlaying);
  }, []);

  const handlePrevious = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 1000) {
      setCurrentTrackIndex((prevIndex) => (prevIndex === 0 ? tracks.length - 1 : prevIndex - 1));
    } else {
      audioRef.current.currentTime = 0;
    }
    lastTapTimeRef.current = now;
  }, []);

  const handleNext = useCallback(() => {
    setCurrentTrackIndex((prevIndex) => (prevIndex === tracks.length - 1 ? 0 : prevIndex + 1));
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressBarClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const progressBar = progressBarRef.current;
      if (!progressBar) return;
      const clickPosition =
        (event.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
      audioRef.current.currentTime = clickPosition * duration;
    },
    [duration],
  );
  const handleProgressBarDrag = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.buttons === 1) {
        handleProgressBarClick(event);
      }
    },
    [handleProgressBarClick],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey) {
        switch (event.key) {
          case ' ':
            event.preventDefault();
            togglePlayPause();
            break;
          case '>':
            event.preventDefault();
            handleNext();
            break;
          case '<':
            event.preventDefault();
            handlePrevious();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause, handleNext, handlePrevious]);

  return (
    <div className={styles.musicPanel}>
      <div className={styles.albumArt}>
        <img alt="" src={tracks[currentTrackIndex].art} />
      </div>
      <div className={styles.musicText}>
        <div className={styles.title}>{tracks[currentTrackIndex].title}</div>
        <img
          className={styles.sourceIcon}
          src={getImagePath('icon-music-bluetooth.svg')}
          alt="Bluetooth"
        />
        <div className={styles.albumTitle}>{tracks[currentTrackIndex].album}</div>
      </div>
      <div className={styles.musicProgressBar}>
        <div
          className={styles.progressBackground}
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarDrag}
        >
          <div
            className={styles.progressForeground}
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className={`${styles.progressIndicator} ctaBtn`}></div>
          </div>
        </div>
        <div className={styles.timeCode}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <div className={styles.musicBtnBar}>
        <button className={styles.musicBtn} onClick={handlePrevious}>
          <img
            className={`${styles.musicIcon} ctaBtn`}
            src={getImagePath('icon-music-previous.svg')}
            alt="Previous Track"
          />
        </button>
        <button className={styles.musicBtn} onClick={togglePlayPause}>
          <img
            className={`${styles.musicIcon} ctaBtn`}
            src={
              isPlaying ? getImagePath('icon-music-pause.svg') : getImagePath('icon-music-play.svg')
            }
            alt="Play & Pause"
          />
        </button>
        <button className={styles.musicBtn} onClick={handleNext}>
          <img
            className={`${styles.musicIcon} ctaBtn`}
            src={getImagePath('icon-music-next.svg')}
            alt="Next Track"
          />
        </button>
        <button className={styles.musicBtn}>
          <img
            className={`${styles.musicIcon} ctaBtn`}
            src={getImagePath('icon-settings.svg')}
            alt="Settings"
          />
        </button>
        <button className={styles.musicBtn}>
          <img
            className={`${styles.musicIcon} ctaBtn`}
            src={getImagePath('icon-search.svg')}
            alt="Search"
          />
        </button>
      </div>
    </div>
  );
}
