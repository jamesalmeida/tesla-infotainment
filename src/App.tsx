import { lazy, Suspense, useRef, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import { getImagePath } from './utils/assetPaths';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { CarLockProvider } from './contexts/CarLockContext';
import { CarStateProvider, useCarActions, useCarState } from './state/CarStateContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLoadingScreen } from './hooks/useLoadingScreen';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type PanelImperativeHandle,
  type PanelSize,
} from 'react-resizable-panels';
import { MapNavigation } from './components/MapNavigation/MapNavigation';
import { MusicPanel } from './components/MusicPanel/MusicPanel';
import { Modal } from './components/Modal/Modal';
import { AppShelf } from './components/AppShelf/AppShelf';
import VerticalSliderPanel from './components/VerticalSliderPanel/VerticalSliderPanel';
import BtmNavBar from './components/BtmNavBar/BtmNavBar';
import CarLock from './components/CarLock/CarLock';
import BatteryStatus from './components/BatteryStatus/BatteryStatus';
import GearSelect from './components/GearSelect/GearSelect';
import ErrorScreen from './components/ErrorScreen/ErrorScreen';
import './App.css';

// three.js and react-three-fiber are most of the bundle; the loading screen covers the wait.
const VehicleModel = lazy(() =>
  import('./components/VehicleModel/VehicleModel').then((module) => ({
    default: module.VehicleModel,
  })),
);

const DEFAULT_LEFT_PANEL_SIZE = 40;
// An open app needs the right panel to be at least this wide.
const MAX_LEFT_PANEL_SIZE_WITH_APP = 33;

function App() {
  return (
    <CarStateProvider>
      <CarLockProvider>
        <UserProfileProvider>
          <Display />
        </UserProfileProvider>
      </CarLockProvider>
    </CarStateProvider>
  );
}

function Display() {
  const {
    gear,
    isSliderOpen,
    activeApp,
    activeModal,
    openCompartment,
    leftSignal,
    rightSignal,
    volume,
  } = useCarState();
  const { closeSlider, closeModal, openWifiSettings, toggleFrunk, toggleTrunk } = useCarActions();
  const appContentRef = useRef<HTMLDivElement>(null);
  const isLoading = useLoadingScreen(appContentRef);
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const isPanelResizable = gear === 'D';
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'tesla-panels',
    storage: localStorage,
  });

  useKeyboardShortcuts();

  // Leaving Drive snaps the panels back to their default split.
  useEffect(() => {
    if (gear !== 'D' && leftPanelRef.current) {
      leftPanelRef.current.resize(`${DEFAULT_LEFT_PANEL_SIZE}%`);
    }
  }, [gear]);

  // Opening an app shrinks a widened left panel to make room for it...
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (isSliderOpen && panel && panel.getSize().asPercentage > MAX_LEFT_PANEL_SIZE_WITH_APP) {
      panel.resize(`${MAX_LEFT_PANEL_SIZE_WITH_APP}%`);
    }
  }, [isSliderOpen, activeApp]);

  // ...and widening the left panel past that closes the app.
  const handleLeftPanelResize = (size: PanelSize) => {
    if (size.asPercentage > MAX_LEFT_PANEL_SIZE_WITH_APP && isSliderOpen) {
      closeSlider();
    }
  };

  return (
    <>
      {isLoading && <LoadingScreen />}
      <div id="displayBezel" ref={appContentRef} style={{ display: isLoading ? 'none' : 'block' }}>
        <div className="displayWrapper">
          {/* <div className="screenTooSmallError">I'm sorry Dave, I'm afraid I can't do that{dots}</div> */}
          <ErrorScreen />
          <Group
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
            orientation="horizontal"
            className="horizontalPanelGroup"
          >
            <Panel
              defaultSize={`${DEFAULT_LEFT_PANEL_SIZE}%`}
              minSize={`${DEFAULT_LEFT_PANEL_SIZE}%`}
              maxSize="100%"
              className="leftPanel"
              panelRef={leftPanelRef}
              onResize={handleLeftPanelResize}
            >
              <div className="carStatusIcons">
                <div className="topBarCarStatusIcons">
                  <GearSelect />
                  <BatteryStatus />
                </div>
                <div className={`drivingGearIcons`}>
                  <div className={`speedometer ${gear === 'D' ? 'fade-in' : 'fade-out'}`}>
                    0<br />
                    <span>MPH</span>
                  </div>
                  <div
                    className={`turnSignal ${leftSignal ? 'active' : ''}`}
                    style={{ opacity: leftSignal ? 1 : 0 }}
                  >
                    <img src={getImagePath('icon-turn-left.svg')} alt="Turn Signal Left" />
                  </div>
                  <div
                    className={`turnSignal ${rightSignal ? 'active' : ''}`}
                    style={{ opacity: rightSignal ? 1 : 0 }}
                  >
                    <img src={getImagePath('icon-turn-right.svg')} alt="Turn Signal Right" />
                  </div>
                  <div className={`speedLimit ${gear === 'D' ? 'fade-in' : 'fade-out'}`}>
                    SPEED
                    <br />
                    LIMIT
                    <br />
                    <span>30</span>
                  </div>
                </div>
              </div>
              <div className={`carModelStatus ${gear === 'D' ? 'fade-out' : 'fade-in'}`}>
                <div className="toggleFrunk no-select" onClick={toggleFrunk}>
                  {openCompartment === 'frunk' ? 'Close' : 'Open'}
                  <br />
                  <span className="frunk">Frunk</span>
                </div>
                <div className="toggleLocks">
                  <CarLock />
                </div>
                <div className="toggleTrunk no-select" onClick={toggleTrunk}>
                  {openCompartment === 'trunk' ? 'Close' : 'Open'}
                  <br />
                  <span className="trunk">Trunk</span>
                </div>
              </div>
              <Suspense fallback={null}>
                <VehicleModel
                  rotateToFrunk={openCompartment === 'frunk'}
                  rotateToTrunk={openCompartment === 'trunk'}
                  activeGear={gear}
                />
              </Suspense>
              <MusicPanel volume={volume} />
            </Panel>
            {isPanelResizable && <Separator className="panelResizeHandle" />}
            <Panel
              defaultSize="67%"
              minSize="0%"
              maxSize={isPanelResizable ? '67%' : `${100 - DEFAULT_LEFT_PANEL_SIZE}%`}
              className="rightPanel"
              id="rightPanel"
            >
              <MapNavigation onWifiClick={openWifiSettings} />
              <VerticalSliderPanel
                isOpen={isSliderOpen}
                activeIcon={activeApp}
                onClose={closeSlider}
              />
            </Panel>
          </Group>
          <BtmNavBar />
          <Modal isVisible={activeModal !== null} onClose={closeModal} modalType={activeModal}>
            {activeModal === 'app-shelf' && <AppShelf />}
          </Modal>
        </div>
      </div>
      <div className="small-screen-message">
        Best viewed on a larger screen.
        <br />
        <span>
          For now, try turning your phone sideways.
          <br />
          At least until I tweak the mobile styles.
        </span>
      </div>
    </>
  );
}

export default App;
