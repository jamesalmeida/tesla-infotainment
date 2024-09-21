import React, { useState, useRef, useEffect } from 'react';
import VerticalSliderPanel from './components/VerticalSliderPanel/VerticalSliderPanel';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { VehicleModel } from './components/VehicleModel/VehicleModel';
import { MusicPanel } from './components/MusicPanel/MusicPanel';
import { MapNavigation } from './components/MapNavigation/MapNavigation';
import { Modal } from './components/Modal/Modal';
import CarLock from './components/CarLock/CarLock';
import BtmNavBar from './components/BtmNavBar/BtmNavBar';
import VolumeControl from './components/VolumeControl/VolumeControl';
import TemperatureControl from './components/TemperatureControl/TemperatureControl';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { CarLockProvider } from './contexts/CarLockContext';
import './App.css';
import BatteryStatus from './components/BatteryStatus/BatteryStatus';

const formatAppName = (appName) => {
  return appName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function App() {
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [activeNavIcon, setActiveNavIcon] = useState(null);
  const [temperature, setTemperature] = useState(70);
  const [activeModal, setActiveModal] = useState(null);
  const [volume, setVolume] = useState(50);
  const leftPanelRef = useRef(null);
  const [isShelfOpen, setIsShelfOpen] = useState(false);
  const [rotateToFrunk, setRotateToFrunk] = useState(false);
  const [rotateToTrunk, setRotateToTrunk] = useState(false);
  const [activeGear, setActiveGear] = useState('P'); // Add this line
  const [isCameraForced, setIsCameraForced] = useState(false);
  const [isPanelResizable, setIsPanelResizable] = useState(false);
  const DEFAULT_LEFT_PANEL_SIZE = 40;

  const appsTopShelf = [
    'wipers',
    'defrost-front',
    'defrost-rear',
    'left-seat',
    // 'right-seat',
    'fan',
  ];

  const apps = [
    'bluetooth',
    'camera',
    'calendar',
    'dashcam',
    'podcasts',
    'amazon-music',
    'apple-music',
    'youtube-music',
    'spotify',
    'browser',
    'theater',
    'radio',
    'energy',
    'audible',
    'nav',
    'phone',
    'messages',
    'caraoke',
    'manual',
    'toybox',
    'arcade',
    'tidal',
  ];

  const handleNavIconClick = (iconName) => {
    if (iconName === 'open-shelf') {
      setIsShelfOpen(!isShelfOpen);
      setActiveModal(isShelfOpen ? null : 'app-shelf');
    } else if (iconName.type === 'volume') {
      setActiveModal('volume');
    } else if (iconName.type === 'temperature') {
      setActiveModal('temperature');
    } else if (isSliderOpen && activeNavIcon === iconName && !isCameraForced) {
      setIsSliderOpen(false);
      setActiveNavIcon(null);
    } else if (!isCameraForced || iconName === 'camera') {
      setActiveNavIcon(iconName);
      setIsSliderOpen(true);
    }

    if (leftPanelRef.current && leftPanelRef.current.getSize() > 33) {
      leftPanelRef.current.resize(33);
    }
  };

  const handleModalClose = () => {
    setActiveModal(null);
  };

  const handleSliderClose = () => {
    if (!isCameraForced) {
      setIsSliderOpen(false);
      setActiveNavIcon(null);
    }
  };

  const handleLeftPanelResize = (size) => {
    if (size > 33 && isSliderOpen) {
      handleSliderClose();
    }
  };

  const handleToggleFrunk = () => {
    setRotateToFrunk(prev => !prev);
    setRotateToTrunk(false); // Ensure trunk is closed when toggling frunk
  };

  const handleToggleTrunk = () => {
    setRotateToTrunk(prev => !prev);
    setRotateToFrunk(false); // Ensure frunk is closed when toggling trunk
  };

  const handleGearSelect = (gear) => {
    setActiveGear(gear);
    if (gear === 'R') {
      setActiveNavIcon('camera');
      setIsSliderOpen(true);
      setIsCameraForced(true);
    } else {
      setIsCameraForced(false);
      setIsSliderOpen(false);
      setActiveNavIcon(null);
    }

    if (gear === 'D') {
      setIsPanelResizable(true);
    } else {
      setIsPanelResizable(false);
      if (leftPanelRef.current) {
        leftPanelRef.current.resize(DEFAULT_LEFT_PANEL_SIZE);
      }
    }
  };

  useEffect(() => {
    if (activeGear !== 'D' && leftPanelRef.current) {
      leftPanelRef.current.resize(DEFAULT_LEFT_PANEL_SIZE);
    }
  }, [activeGear]);


  const renderModalContent = () => {
    switch (activeModal) {
      case 'app-shelf':
        return (
          <div className="appShelfContainer">
            <div className="customizeBtn">Customize</div>
            <div className="appTopShelf">
              {appsTopShelf.map((icon, index) => (
                <div key={index} className="appShelfIcon">
                  <img  
                    src={`/img/app-${icon}.svg`} 
                    alt={`${icon} icon`} 
                  />
                  <div className="appShelfIconText">{formatAppName(icon)}</div>
                </div>
              ))}
            </div>
            <div className="appShelf">
              {apps.map((icon, index) => (
                <div key={index} className="appShelfIcon">
                  <img 
                    src={`/img/app-${icon}.svg`} 
                    alt={`${icon} icon`} 
                  />
                  <div className="appShelfIconText">{formatAppName(icon)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'volume':
        return (
          <div>
            <h2>Volume Control</h2>
            <VolumeControl
              volume={volume}
              onIncrement={() => setVolume(prev => Math.min(prev + 1, 100))}
              onDecrement={() => setVolume(prev => Math.max(prev - 1, 0))}
            />
          </div>
        );
      case 'temperature':
        return (
          <div>
            <h2>Temperature Control</h2>
            <TemperatureControl
              temperature={temperature}
              onIncrement={() => setTemperature(prev => Math.min(prev + 1, 90))}
              onDecrement={() => setTemperature(prev => Math.max(prev - 1, 60))}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const handleOpenAudioSettings = () => {
    setActiveNavIcon('car-settings');
    setIsSliderOpen(true);
  };

  return (
    <CarLockProvider>
      <UserProfileProvider>
        <div id="displayBezel">
          <PanelGroup autoSaveId="example" direction="horizontal" className="horizontalPanelGroup">
            <Panel 
              defaultSize={DEFAULT_LEFT_PANEL_SIZE}
              minSize={DEFAULT_LEFT_PANEL_SIZE}
              maxSize={100}
              className="leftPanel"
              ref={leftPanelRef}
              onResize={handleLeftPanelResize}
            >
              <div className="carStatusIcons">
                <div className="gearSelect no-select">
                  {['P', 'R', 'N', 'D'].map((gear) => (
                    <span
                      key={gear}
                      className={`gearSelectIcon ${activeGear === gear ? 'active' : ''}`}
                      onClick={() => handleGearSelect(gear)}
                    >
                      {gear}
                    </span>
                  ))}
                </div>
                <BatteryStatus />
              </div>
              <div className="carModelStatus">
                <div className="toggleFrunk no-select" onClick={handleToggleFrunk}>
                  {rotateToFrunk ? 'Close' : 'Open'}<br /><span className="frunk">Frunk</span>
                </div>
                <div className="toggleTrunk no-select" onClick={handleToggleTrunk}>
                  {rotateToTrunk ? 'Close' : 'Open'}<br /><span className="trunk">Trunk</span>
                </div>
                <div className="toggleLocks"><CarLock /></div>
              </div>
              <VehicleModel rotateToFrunk={rotateToFrunk} rotateToTrunk={rotateToTrunk} />
              <MusicPanel volume={volume} />
            </Panel>
            {isPanelResizable && (
              <PanelResizeHandle className="panelResizeHandle" />
            )}
            <Panel 
              defaultSize={67}
              minSize={0}
              maxSize={isPanelResizable ? 67 : 100 - DEFAULT_LEFT_PANEL_SIZE}
              className="rightPanel"
              id="rightPanel"
            >
              <MapNavigation/>
              <VerticalSliderPanel 
                isOpen={isSliderOpen} 
                activeIcon={activeNavIcon}
                onClose={handleSliderClose}
                isCameraForced={isCameraForced}
              />
            </Panel>
          </PanelGroup>
          <BtmNavBar 
            handleNavIconClick={handleNavIconClick}
            temperature={temperature}
            setTemperature={setTemperature}
            volume={volume}
            setVolume={setVolume}
            activeNavIcon={activeNavIcon}
            isShelfOpen={isShelfOpen}
            isCameraForced={isCameraForced}
          />
          <Modal 
            isVisible={activeModal !== null}
            onClose={handleModalClose}
            modalType={activeModal}
          >
            {renderModalContent()}
          </Modal>
        </div>
      </UserProfileProvider>
    </CarLockProvider>
  );
}

export default App;