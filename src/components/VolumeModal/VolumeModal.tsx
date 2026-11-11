import { useState } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import styles from './VolumeModal.module.css';

interface VolumeModalProps {
  volume: number;
  isFading: boolean;
  onVolumeChange: (volume: number) => void;
  // Any interaction keeps the popup up; the timer lives in VolumeControl.
  onActivity: () => void;
  onOpenAudioSettings: () => void;
}

const VolumeModal = ({
  volume,
  isFading,
  onVolumeChange,
  onActivity,
  onOpenAudioSettings,
}: VolumeModalProps) => {
  const [lastVolume, setLastVolume] = useState(50);
  const muted = volume === 0;

  const toggleMute = () => {
    if (muted) onVolumeChange(lastVolume || 50);
    else {
      setLastVolume(volume);
      onVolumeChange(0);
    }
    onActivity();
  };

  return (
    <div
      className={`${styles['volume-modal']} ${isFading ? styles['fade-out'] : ''}`}
      onPointerMove={onActivity}
      onPointerDown={onActivity}
      onMouseMove={onActivity}
    >
      <button type="button" className={styles['audio-settings-btn']} onClick={onOpenAudioSettings}>
        <img src={getImagePath('icon-settings.svg')} alt="Audio Settings" />
      </button>
      <button
        type="button"
        className={`${styles['mute-btn']} ${muted ? styles.muted : ''}`}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        onClick={toggleMute}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10v4h4l5 4V6L8 10Z" />
          {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M17 8a6 6 0 0 1 0 8" />}
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        aria-label="Volume"
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        className={styles['volume-slider']}
      />
    </div>
  );
};

export default VolumeModal;
