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
}: VolumeModalProps) => (
  <div
    className={`${styles['volume-modal']} ${isFading ? styles['fade-out'] : ''}`}
    onPointerMove={onActivity}
    onPointerDown={onActivity}
    onMouseMove={onActivity}
  >
    <button type="button" className={styles['audio-settings-btn']} onClick={onOpenAudioSettings}>
      <img src={getImagePath('icon-settings.svg')} alt="Audio Settings" />
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

export default VolumeModal;
