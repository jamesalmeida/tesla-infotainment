import React, { useEffect, useRef, useState } from 'react';
import './VolumeModal.css';

const VolumeModal = ({ volume, onVolumeChange, onClose, onOpenAudioSettings }) => {
  const modalRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    resetCloseTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const resetCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(startFadeOut, 1500);
  };

  const startFadeOut = () => {
    setIsFading(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match this with the CSS transition duration
  };

  const handleVolumeChange = (e) => {
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
        <img src="/img/icon-settings.svg" alt="Audio Settings" />
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