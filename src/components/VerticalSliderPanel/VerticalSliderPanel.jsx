import { useState, useRef } from 'react';
import './VerticalSliderPanel.css';
import { AppleMusic } from '../Apps/AppleMusic/AppleMusic';
import { Arcade } from '../Apps/Arcade/Arcade';
import { BackupCam } from '../Apps/BackupCam/BackupCam';
import { Bluetooth } from '../Apps/Bluetooth/Bluetooth';
import { Calendar } from '../Apps/Calendar/Calendar';
import { CarSettings } from '../Apps/CarSettings/CarSettings';
import { Dashcam } from '../Apps/Dashcam/Dashcam';
import { Podcasts } from '../Apps/Podcasts/Podcasts';
import { Toybox } from '../Apps/Toybox/Toybox';

const VerticalSliderPanel = ({
  isOpen,
  activeIcon,
  onClose,
  isWifiMenuOpen,
  setIsWifiMenuOpen,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const panelRef = useRef(null);

  const getPanelClassName = () => {
    let className = `vertical-slider-panel ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`;
    if (isOpen) {
      className += ' open';
    }
    if (activeIcon === 'camera') {
      className += ' camera-background';
    }
    return className;
  };

  const handleStart = (clientY) => {
    if (isOpen) {
      setIsDragging(true);
      setStartY(clientY);
      setCurrentY(0);
    }
  };

  const handleMove = (clientY) => {
    if (isDragging) {
      const deltaY = clientY - startY;
      setCurrentY(Math.max(0, deltaY));
    }
  };

  const handleEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (currentY > 50) {
        // If dragged down more than 50px
        onClose(); // Trigger closing animation
      }
      setCurrentY(0);
    }
  };

  const renderContent = () => {
    switch (activeIcon) {
      case 'apple-music':
        return <AppleMusic />;
      case 'arcade':
        return <Arcade />;
      case 'bluetooth':
        return <Bluetooth />;
      case 'calendar':
        return <Calendar />;
      case 'camera':
        return <BackupCam />;
      case 'car-settings':
        return (
          <CarSettings isWifiMenuOpen={isWifiMenuOpen} setIsWifiMenuOpen={setIsWifiMenuOpen} />
        );
      case 'dashcam':
        return <Dashcam />;
      case 'podcasts':
        return <Podcasts />;
      case 'toybox':
        return <Toybox />;
      default:
        return null;
    }
  };

  const panelStyle = isDragging ? { transform: `translateY(${currentY}px)` } : {};

  return (
    <div
      ref={panelRef}
      className={getPanelClassName()}
      style={panelStyle}
      onTouchStart={(e) => handleStart(e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientY)}
      onMouseMove={(e) => handleMove(e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div className="slider-handle"></div>
      <div className="slider-content">{renderContent()}</div>
      {/* {!isCameraForced && <button onClick={handleClose}>Close</button>} */}
    </div>
  );
};

export default VerticalSliderPanel;
