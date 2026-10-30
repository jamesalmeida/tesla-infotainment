import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import './VolumeModal.css';

interface VolumeModalProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
  onOpenAudioSettings: () => void;
}

const VolumeModal = ({
  volume,
  onVolumeChange,
  onClose,
  onOpenAudioSettings,
}: VolumeModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFading, setIsFading] = useState(false);

  const startFadeOut = () => {
    setIsFading(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match this with the CSS transition duration
  };

  const resetCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(startFadeOut, 3000);
  };

  useEffect(() => {
    resetCloseTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // The auto-close timer intentionally starts once on mount rather than
    // restarting whenever resetCloseTimer's identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(e.target.value));
    resetCloseTimer();
  };

  const handleMouseMove = () => {
    resetCloseTimer();
  };

  return (
    <div
      className={`volume-modal ${isFading ? 'fade-out' : ''}`}
      ref={modalRef}
      onMouseMove={handleMouseMove}
    >
      <button className="audio-settings-btn" onClick={onOpenAudioSettings}>
        <img src={getImagePath('icon-settings.svg')} alt="Audio Settings" />
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleVolumeChange}
        className="volume-slider"
      />
      {/* <div className="volume-value">{volume}</div> */}
    </div>
  );
};

export default VolumeModal;
