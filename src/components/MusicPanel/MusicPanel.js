import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MusicPanel.css';

const tracks = [
  {
    title: "#440 - Pieter Levels: Programming, Viral Al Startups, and Digital Nomad Life",
    album: "Lex Fridman Podcast",
    art: "/audio/podcasts/lex_fridman_podcast.png",
    audio: "/audio/podcasts/lex_fridman_440_ai_pieter_levels.mp3"
  },
  {
    title: "#438 – Elon Musk: Neuralink and the Future of Humanity",
    album: "Lex Fridman Podcast",
    art: "/audio/podcasts/lex_fridman_podcast.png",
    audio: "/audio/podcasts/lex_fridman_438_ai_elon_musk_and_neuralink_team.mp3"
  },
  {
    title: "SEP 5 - S01E77 - The Road to Autonomous Intelligence with Andrej Karpathy",
    album: "No Priors Podcast",
    art: "/audio/podcasts/no_priors_podcast.png",
    audio: "/audio/podcasts/no_priors_S01E77.mp3"
  },
  // Add more tracks here
];

const getRandomIndex = (max) => Math.floor(Math.random() * max);

export function MusicPanel({ volume }) {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(() => getRandomIndex(tracks.length));
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(new Audio(tracks[currentTrackIndex].audio));
    const lastTapTimeRef = useRef(0);
    const progressBarRef = useRef(null);
    const currentTimeRef = useRef(0);

    useEffect(() => {
        const audio = audioRef.current;
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', () => {});
        };
    }, []);

    useEffect(() => {
        audioRef.current.src = tracks[currentTrackIndex].audio;
        if (isPlaying) {
            audioRef.current.currentTime = currentTimeRef.current;
            audioRef.current.play().catch(error => console.error("Playback failed:", error));
        } else {
            audioRef.current.pause();
        }
    }, [currentTrackIndex, isPlaying]);

    useEffect(() => {
        audioRef.current.volume = volume / 100;
    }, [volume]);

    const updateProgress = () => {
        currentTimeRef.current = audioRef.current.currentTime;
        setCurrentTime(currentTimeRef.current);
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handlePrevious = () => {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 1000) {
            setCurrentTrackIndex((prevIndex) => 
                prevIndex === 0 ? tracks.length - 1 : prevIndex - 1
            );
        } else {
            audioRef.current.currentTime = 0;
        }
        lastTapTimeRef.current = now;
    };

    const handleNext = () => {
        setCurrentTrackIndex((prevIndex) => 
            prevIndex === tracks.length - 1 ? 0 : prevIndex + 1
        );
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressBarClick = useCallback((event) => {
        const progressBar = progressBarRef.current;
        const clickPosition = (event.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
        audioRef.current.currentTime = clickPosition * duration;
    }, [duration]);
    const handleProgressBarDrag = useCallback((event) => {
        if (event.buttons === 1) {
            handleProgressBarClick(event);
        }
    }, [handleProgressBarClick]);

    return (
        <div className="musicPanel">
            <div className="albumArt">
                <img alt="" src={tracks[currentTrackIndex].art}/>
            </div>
            <div className="musicText">
                <div className="title">{tracks[currentTrackIndex].title}</div>
                <img className="sourceIcon" src="/img/icon-music-bluetooth.svg" alt="Bluetooth" />
                <div className="albumTitle">{tracks[currentTrackIndex].album}</div>
            </div>
            <div className="musicProgressBar">
                <div 
                    className="progressBackground"
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                    onMouseMove={handleProgressBarDrag}
                >
                    <div 
                        className="progressForeground" 
                        style={{width: `${(currentTime / duration) * 100}%`}}
                    >
                        <div className="progressIndicator"></div>
                    </div>
                </div>
                <div className="timeCode">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
            <div className="musicBtnBar">
                <button className="musicBtn" onClick={handlePrevious}>
                    <img className="musicIcon" src="/img/icon-music-previous.svg" alt="Previous Track" />
                </button>
                <button className="musicBtn" onClick={togglePlayPause}>
                    <img 
                        className="musicIcon" 
                        src={isPlaying ? "/img/icon-music-pause.svg" : "/img/icon-music-play.svg"} 
                        alt="Play & Pause" 
                    />
                </button>
                <button className="musicBtn" onClick={handleNext}>
                    <img className="musicIcon" src="/img/icon-music-next.svg" alt="Next Track" />
                </button>
                <button className="musicBtn">
                    <img className="musicIcon" src="/img/icon-settings.svg" alt="Settings" />
                </button>
                <button className="musicBtn">
                    <img className="musicIcon" src="/img/icon-search.svg" alt="Search" />
                </button>
            </div>
        </div>
    );
}


