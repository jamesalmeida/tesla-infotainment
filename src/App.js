import React, { useState, useRef, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import { VehicleModel } from './components/VehicleModel/VehicleModel';
import { getImagePath } from './utils/assetPaths';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { CarLockProvider } from './contexts/CarLockContext';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MapNavigation } from './components/MapNavigation/MapNavigation';
import { MusicPanel } from './components/MusicPanel/MusicPanel';
import { Modal } from './components/Modal/Modal';
import VerticalSliderPanel from './components/VerticalSliderPanel/VerticalSliderPanel';
import BtmNavBar from './components/BtmNavBar/BtmNavBar';
import CarLock from './components/CarLock/CarLock';
import VolumeControl from './components/VolumeControl/VolumeControl';
import TemperatureControl from './components/TemperatureControl/TemperatureControl';
import BatteryStatus from './components/BatteryStatus/BatteryStatus';
import GearSelect from './components/GearSelect/GearSelect';
import { useDots } from './utils/dots';
import './App.css';

const formatAppName = (appName) => {
  return appName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
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
  const dots = useDots();

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
                    src={getImagePath(`app-${icon}.svg`)}
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
                    src={getImagePath(`app-${icon}.svg`)} 
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
  
  const appContentRef = useRef(null);

  useEffect(() => {
    const checkIfLoaded = () => {
      if (appContentRef.current) {
        const images = Array.from(appContentRef.current.querySelectorAll('img'));
        console.log(`Checking ${images.length} images`);
        
        const allLoaded = images.every((img) => {
          const isLoaded = img.complete && img.naturalHeight !== 0;
          if (!isLoaded) {
            console.log(`Image not loaded: ${img.src}`);
          }
          return isLoaded;
        });

        if (allLoaded) {
          console.log('All images loaded, waiting 5 seconds before hiding loading screen');
          setTimeout(() => {
            console.log('3 seconds passed, setting isLoading to false');
            setIsLoading(false);
          }, 3000);
        } else {
          console.log('Not all images loaded, checking again in 100ms');
          setTimeout(checkIfLoaded, 100);
        }
      } else {
        console.log('appContentRef.current is null, checking again in 100ms');
        setTimeout(checkIfLoaded, 100);
      }
    };

    checkIfLoaded();

    // Fallback timer to ensure loading screen doesn't stay indefinitely
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback timer triggered, forcing isLoading to false');
      setIsLoading(false);
    }, 15000); // 15 seconds fallback (5 seconds delay + 10 seconds original fallback)

    return () => clearTimeout(fallbackTimer);
  }, []);

  // For keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if the active element is an input field
      if (event.target.tagName.toLowerCase() === 'input') {
        return; // Exit the function if we're typing in an input field
      }
  
      switch (event.key.toUpperCase()) {
        case 'F':
          handleToggleFrunk();
          break;
        case 'T':
          handleToggleTrunk();
          break;
        default:
          break;
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);  // Empty dependency array means this effect runs once on mount

  return (
    <CarLockProvider>
      <UserProfileProvider>
        {isLoading && <LoadingScreen />}
        <div id="displayBezel" ref={appContentRef} style={{display: isLoading ? 'none' : 'block'}}>
          <div className="displayWrapper">
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
                  <GearSelect activeGear={activeGear} onGearSelect={handleGearSelect} />
                  <BatteryStatus />
                </div>
                <div className="carModelStatus">
                  <div className="toggleFrunk no-select" onClick={handleToggleFrunk}>
                    {rotateToFrunk ? 'Close' : 'Open'}<br /><span className="frunk">Frunk</span>
                  </div>
                  <div className="toggleLocks"><CarLock /></div>
                  <div className="toggleTrunk no-select" onClick={handleToggleTrunk}>
                    {rotateToTrunk ? 'Close' : 'Open'}<br /><span className="trunk">Trunk</span>
                  </div>
                  
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
        </div>
        <div className="small-screen-message">
          I'm sorry Dave, I'm afraid I can't do that{dots}<br />
          Best viewed on a larger screen.<br />
          <span>For now, try turning your phone sideways.<br />
          At least until I tweak the mobile styles.</span>
        </div>
      </UserProfileProvider>
    </CarLockProvider>
  );
}

export default App;