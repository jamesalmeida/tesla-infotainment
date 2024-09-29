import React, { useState, useRef } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import VolumeModal from '../VolumeModal/VolumeModal';
import './VolumeControl.css';

const VolumeControl = ({ volume, onVolumeChange, onOpenAudioSettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const volumeControlRef = useRef(null);

  const handleVolumeClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleVolumeChange = (newVolume) => {
    onVolumeChange(newVolume);
  };

  const adjustVolume = (increment) => {
    const newVolume = Math.max(0, Math.min(100, volume + increment));
    handleVolumeChange(newVolume);
    setIsModalOpen(true);
  };

  return (
    <div className="volume-control" ref={volumeControlRef}>
      <img 
        className={`navIcons arrows`}
        src={getImagePath("icon-vol-down.svg")} 
        alt="Decrease volume" 
        onClick={() => adjustVolume(-10)}
      />
      <img 
        className={`navIcons volume-display`}
        src={getImagePath("icon-volume.svg")} 
        alt="Volume" 
        onClick={handleVolumeClick}
      />
      <img 
        className={`navIcons arrows`}
        src={getImagePath("icon-vol-up.svg")} 
        alt="Increase volume" 
        onClick={() => adjustVolume(10)}
      />
      {isModalOpen && (
        <div className="volume-modal-container">
          <VolumeModal
            volume={volume}
            onVolumeChange={handleVolumeChange}
            onClose={handleCloseModal}
            onOpenAudioSettings={onOpenAudioSettings}
          />
        </div>
      )}
    </div>
  );
};

export default VolumeControl;