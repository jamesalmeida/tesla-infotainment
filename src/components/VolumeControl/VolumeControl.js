import React, { useState, useRef, useEffect } from 'react';
import { getImagePath } from '../../utils/imagePath';
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

  return (
    <div className="volume-control" ref={volumeControlRef}>
      <img 
        className={`navIcons arrows`}
        src={getImagePath("icon-vol-down.svg")} 
        alt="Decrease volume" 
        onClick={() => {
          handleVolumeChange(Math.max(0, volume - 1));
          setIsModalOpen(true);
        }}
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
        onClick={() => {
          handleVolumeChange(Math.min(100, volume + 1));
          setIsModalOpen(true);
        }}
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