import { useAutoHide } from '../../hooks/useAutoHide';
import { getImagePath } from '../../utils/assetPaths';
import VolumeModal from '../VolumeModal/VolumeModal';
import styles from './VolumeControl.module.css';

const VOLUME_STEP = 10;

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onOpenAudioSettings: () => void;
}

const VolumeControl = ({ volume, onVolumeChange, onOpenAudioSettings }: VolumeControlProps) => {
  const { phase, show, hide } = useAutoHide();

  const changeVolume = (newVolume: number) => {
    onVolumeChange(newVolume);
    show();
  };

  const adjustVolume = (increment: number) => {
    changeVolume(Math.max(0, Math.min(100, volume + increment)));
  };

  return (
    <div className={styles['volume-control']}>
      <button
        type="button"
        className={`navIconWrapper ${styles['volume-btn']}`}
        onClick={() => adjustVolume(-VOLUME_STEP)}
      >
        <img
          className="navIcons arrows"
          src={getImagePath('icon-vol-down.svg')}
          alt="Decrease volume"
        />
      </button>
      <button
        type="button"
        className={`navIconWrapper ${styles['volume-btn']}`}
        aria-expanded={phase !== 'hidden'}
        onClick={phase === 'visible' ? hide : show}
      >
        <img
          className={`navIcons ${styles['volume-display']}`}
          src={getImagePath('icon-volume.svg')}
          alt="Volume"
        />
      </button>
      <button
        type="button"
        className={`navIconWrapper ${styles['volume-btn']}`}
        onClick={() => adjustVolume(VOLUME_STEP)}
      >
        <img
          className="navIcons arrows"
          src={getImagePath('icon-vol-up.svg')}
          alt="Increase volume"
        />
      </button>
      {phase !== 'hidden' && (
        <div className={styles['volume-modal-container']}>
          <VolumeModal
            volume={volume}
            isFading={phase === 'fading'}
            onVolumeChange={changeVolume}
            onActivity={show}
            onOpenAudioSettings={onOpenAudioSettings}
          />
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
