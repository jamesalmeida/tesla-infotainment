import { lazy, Suspense, useState, useRef, type ComponentType } from 'react';
import type { AppId } from '../../state/carState';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './VerticalSliderPanel.css';

// Each app is its own chunk, downloaded the first time it is opened.
const lazyNamed = <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] as ComponentType })));

const AppleMusic = lazyNamed(() => import('../Apps/AppleMusic/AppleMusic'), 'AppleMusic');
const Arcade = lazyNamed(() => import('../Apps/Arcade/Arcade'), 'Arcade');
const BackupCam = lazyNamed(() => import('../Apps/BackupCam/BackupCam'), 'BackupCam');
const Bluetooth = lazyNamed(() => import('../Apps/Bluetooth/Bluetooth'), 'Bluetooth');
const Calendar = lazyNamed(() => import('../Apps/Calendar/Calendar'), 'Calendar');
const CarSettings = lazyNamed(() => import('../Apps/CarSettings/CarSettings'), 'CarSettings');
const Dashcam = lazyNamed(() => import('../Apps/Dashcam/Dashcam'), 'Dashcam');
const Podcasts = lazyNamed(() => import('../Apps/Podcasts/Podcasts'), 'Podcasts');
const Toybox = lazyNamed(() => import('../Apps/Toybox/Toybox'), 'Toybox');

interface VerticalSliderPanelProps {
  isOpen: boolean;
  activeIcon?: AppId | null;
  onClose: () => void;
}

const VerticalSliderPanel = ({ isOpen, activeIcon, onClose }: VerticalSliderPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleStart = (clientY: number) => {
    if (isOpen) {
      setIsDragging(true);
      setStartY(clientY);
      setCurrentY(0);
    }
  };

  const handleMove = (clientY: number) => {
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
        return <CarSettings />;
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
      <div className="slider-content">
        <Suspense fallback={<LoadingSpinner />}>{renderContent()}</Suspense>
      </div>
      {/* {!isCameraForced && <button onClick={handleClose}>Close</button>} */}
    </div>
  );
};

export default VerticalSliderPanel;
