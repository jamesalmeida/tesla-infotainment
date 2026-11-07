import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import { AppOverlays } from './apps/AppOverlays';
import { CarStateProvider, useCar, useCarActions } from './state/CarStateContext';
import {
  activeApp,
  isCameraForced,
  isDriving,
  isPanelOpen,
  isParked,
  leftSignalLit,
  rightSignalLit,
  vehiclePose,
} from './state/carState';
import { useBlink } from './hooks/useBlink';
import { useCarSounds } from './hooks/useCarSounds';
import { useOnScreenKeyboard } from './hooks/useOnScreenKeyboard';
import { OnScreenKeyboard } from './components/OnScreenKeyboard/OnScreenKeyboard';
import { carLightState } from './components/VehicleModel/vehicleLights';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBoot } from './hooks/useBoot';
import { useLayout } from './hooks/useLayout';
import { useSchedule } from './hooks/useSchedule';
import { useSimulation } from './hooks/useSimulation';
import { useUrlSync } from './hooks/useUrlSync';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type Layout,
  type LayoutChangedMeta,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { MapNavigation } from './components/MapNavigation/MapNavigation';
import { CarCards } from './components/CarCards/CarCards';
import { DriveStrip } from './components/DriveStrip/DriveStrip';
import { DrivingVisualization } from './components/DrivingVisualization/DrivingVisualization';
import { Modal } from './components/Modal/Modal';
import { AppShelf } from './components/AppShelf/AppShelf';
import VerticalSliderPanel from './components/VerticalSliderPanel/VerticalSliderPanel';
import BtmNavBar from './components/BtmNavBar/BtmNavBar';
import { BrightnessOverlay } from './components/BrightnessOverlay/BrightnessOverlay';
import CarWashMode from './components/Apps/CarSettings/components/CarWashMode/CarWashMode';
import { CarStatus } from './components/CarStatus/CarStatus';
import { ChargeStatus } from './components/ChargeStatus/ChargeStatus';
import { CompartmentControls } from './components/CarStatus/CompartmentControls';
import { ClimatePanel } from './components/Climate/ClimatePanel';
import { DogModeDisplay } from './components/Climate/DogModeDisplay';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { CarUnavailable, DisplayCrashed } from './components/ErrorBoundary/Fallbacks';
import { DisplayEffects } from './components/DisplayEffects/DisplayEffects';
import { DrivePinPrompt } from './components/DrivePinPrompt/DrivePinPrompt';
import { Emergency } from './components/Emergency/Emergency';
import { Notice } from './components/Notice/Notice';
import { PwaUpdate } from './components/PwaUpdate/PwaUpdate';
import { RearSync } from './components/RearDisplay/RearSync';
import { RestartOverlay } from './components/RestartOverlay/RestartOverlay';
import { StatusIndicators } from './components/StatusIndicators/StatusIndicators';
import { ScreenClean } from './components/ScreenClean/ScreenClean';
import { SentryOverlay } from './components/SentryOverlay/SentryOverlay';
import { SleepOverlay } from './components/SleepOverlay/SleepOverlay';
import { ShortcutsHelp } from './components/ShortcutsHelp/ShortcutsHelp';
import { safeStorage } from './utils/safeStorage';
import { hasWebGL } from './utils/webgl';
import './App.css';

// three.js and react-three-fiber are most of the bundle; the loading screen covers the wait.
const VehicleModel = lazy(() =>
  import('./components/VehicleModel/VehicleModel').then((module) => ({
    default: module.VehicleModel,
  })),
);

const LEFT_PANEL_ID = 'leftPanel';
const DEFAULT_LEFT_PANEL_SIZE = 40;
const RIGHT_PANEL_SIZE = 100 - DEFAULT_LEFT_PANEL_SIZE;
const STACKED_LEFT_PANEL_SIZE = 45;
// A drag has to go this far past the default before it counts as making room for the car.
const CLOSE_APP_DRAG_MARGIN = 3;

function App() {
  return (
    <ErrorBoundary fallback={() => <DisplayCrashed />}>
      <CarStateProvider>
        <Display />
      </CarStateProvider>
    </ErrorBoundary>
  );
}

function VehicleView({ onSettled }: { onSettled: () => void }) {
  const pose = useCar(vehiclePose);
  const state = useCar((current) => current);
  const paint = useCar((current) => current.settings.paint);
  const speed = useCar((current) => current.speed);
  const leftLit = useCar(leftSignalLit);
  const rightLit = useCar(rightSignalLit);
  const blinkOn = useBlink(leftLit || rightLit);
  const lights = carLightState(state, blinkOn);
  const [canRender] = useState(hasWebGL);

  // With no WebGL there is nothing to wait for.
  useEffect(() => {
    if (!canRender) onSettled();
  }, [canRender, onSettled]);

  if (!canRender) return <CarUnavailable />;

  return (
    <div className="vehicleStage">
      <DrivingVisualization />
      <ErrorBoundary fallback={() => <CarUnavailable />} onError={onSettled}>
        <Suspense fallback={null}>
          <VehicleModel
            pose={pose}
            onReady={onSettled}
            lights={lights}
            paint={paint}
            speed={speed}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function ParkViewButton({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`parkViewBtn ${isActive ? 'active' : ''}`}
      aria-pressed={isActive}
      onClick={onToggle}
    >
      {isActive ? 'Exit Park View' : 'Park View'}
    </button>
  );
}

const LeftPanelContent = memo(function LeftPanelContent({
  onCarSettled,
  canParkView,
  isParkView,
  onToggleParkView,
}: {
  onCarSettled: () => void;
  canParkView: boolean;
  isParkView: boolean;
  onToggleParkView: () => void;
}) {
  return (
    <>
      <CarStatus />
      <StatusIndicators />
      <CompartmentControls />
      <ChargeStatus />
      <VehicleView onSettled={onCarSettled} />
      <CarCards />
      <DriveStrip />
      {canParkView && <ParkViewButton isActive={isParkView} onToggle={onToggleParkView} />}
    </>
  );
});

function SlidePanel() {
  const isOpen = useCar(isPanelOpen);
  const app = useCar(activeApp);
  const isForced = useCar(isCameraForced);
  const { closeSurface } = useCarActions();

  return (
    <VerticalSliderPanel
      isOpen={isOpen}
      activeApp={app}
      canDismiss={!isForced}
      onClose={closeSurface}
    />
  );
}

const RightPanelContent = memo(function RightPanelContent() {
  const { openSettings } = useCarActions();
  const handleWifiClick = useCallback(() => openSettings('Wifi'), [openSettings]);

  return (
    <>
      <MapNavigation onWifiClick={handleWifiClick} />
      <SlidePanel />
    </>
  );
});

function ActiveModal() {
  const activeModal = useCar((state) => state.activeModal);
  const { closeModal } = useCarActions();

  return (
    <Modal isVisible={activeModal !== null} onClose={closeModal} modalType={activeModal}>
      {activeModal === 'app-shelf' && <AppShelf />}
      {activeModal === 'climate' && <ClimatePanel />}
      {activeModal === 'shortcuts' && <ShortcutsHelp />}
      {activeModal === 'drive-pin' && <DrivePinPrompt />}
      {activeModal === 'sos' && <Emergency />}
    </Modal>
  );
}

type StackedView = 'car' | 'map';

// Phones show the car or the map; there's no room for both at a useful size.
function StackedViewSwitch({
  view,
  onChange,
}: {
  view: StackedView;
  onChange: (view: StackedView) => void;
}) {
  return (
    <div className="stackedViewSwitch" role="tablist" aria-label="Main view">
      {(['car', 'map'] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          className={view === option ? 'active' : ''}
          onClick={() => onChange(option)}
        >
          {option === 'car' ? 'Car' : 'Map'}
        </button>
      ))}
    </div>
  );
}

function Panels({ onCarSettled }: { onCarSettled: () => void }) {
  const { mode, isTall } = useLayout();
  const driving = useCar(isDriving);
  const parked = useCar(isParked);
  const isOpen = useCar(isPanelOpen);
  const [parkView, setParkView] = useState(false);
  const { closeSurface } = useCarActions();
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'tesla-panels',
    storage: safeStorage,
  });
  const [stackedView, setStackedView] = useState<StackedView>('car');

  const isStacked = mode === 'stacked';
  const hasViewSwitch = isStacked && !isTall;
  // Apps open over the map, so a phone has to be showing it.
  const visibleView = isOpen ? 'map' : stackedView;
  const showParkView = parkView && parked && !isStacked && !isOpen;

  useEffect(() => {
    if (!parked) setParkView(false);
  }, [parked]);

  // The same tree serves every mode, with only the sizes changing. Rendering a different one
  // would remount the map and the audio, so rotating or folding would lose the route and
  // stop playback.
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (hasViewSwitch) panel.resize(visibleView === 'car' ? '100%' : '0%');
    else if (isStacked) panel.resize(`${STACKED_LEFT_PANEL_SIZE}%`);
    // Park View is the full-width scene, with no map beside it.
    else if (showParkView) panel.resize('100%');
    // The split only widens in Drive, and an open app always gets the default width.
    else if (!driving || isOpen) panel.resize(`${DEFAULT_LEFT_PANEL_SIZE}%`);
  }, [driving, isOpen, isStacked, hasViewSwitch, visibleView, showParkView]);

  // Only a real drag of the separator can close an app. Window resizes, rotation and
  // the resize above all land here too, and must not count as intent.
  const handleLayoutChanged = (layout: Layout, meta: LayoutChangedMeta) => {
    if (isStacked) return;
    onLayoutChanged(layout, meta);
    const leftSize = layout[LEFT_PANEL_ID] ?? DEFAULT_LEFT_PANEL_SIZE;
    if (meta.isUserInteraction && leftSize > DEFAULT_LEFT_PANEL_SIZE + CLOSE_APP_DRAG_MARGIN) {
      closeSurface();
    }
  };

  return (
    <>
      {hasViewSwitch && <StackedViewSwitch view={visibleView} onChange={setStackedView} />}
      <Group
        defaultLayout={defaultLayout}
        onLayoutChanged={handleLayoutChanged}
        orientation={isStacked ? 'vertical' : 'horizontal'}
        className="horizontalPanelGroup"
      >
        <Panel
          id={LEFT_PANEL_ID}
          defaultSize={`${DEFAULT_LEFT_PANEL_SIZE}%`}
          minSize={isStacked ? '0%' : `${DEFAULT_LEFT_PANEL_SIZE}%`}
          maxSize="100%"
          className="leftPanel"
          panelRef={leftPanelRef}
        >
          <LeftPanelContent
            onCarSettled={onCarSettled}
            canParkView={parked && !isStacked}
            isParkView={showParkView}
            onToggleParkView={() => setParkView((open) => !open)}
          />
        </Panel>
        {!isStacked && !showParkView && <Separator className="panelResizeHandle" />}
        <Panel
          id="rightPanel"
          defaultSize={`${RIGHT_PANEL_SIZE}%`}
          minSize="0%"
          maxSize={isStacked ? '100%' : `${RIGHT_PANEL_SIZE}%`}
          className="rightPanel"
        >
          <RightPanelContent />
        </Panel>
      </Group>
    </>
  );
}

function Display() {
  const { isLoading, onContentSettled } = useBoot();

  useKeyboardShortcuts();
  useSimulation();
  useUrlSync();
  useSchedule();
  useCarSounds();
  const { target: keyboardTarget, close: closeKeyboard } = useOnScreenKeyboard();

  return (
    <>
      {isLoading && <LoadingScreen />}
      <div id="displayBezel" className="displayBezel">
        <div className="displayWrapper">
          <Panels onCarSettled={onContentSettled} />
          <BtmNavBar />
          <ActiveModal />
          <AppOverlays />
          <Notice />
          <CarWashMode />
          <SentryOverlay />
          <DisplayEffects />
          <DogModeDisplay />
          <RestartOverlay />
          <BrightnessOverlay />
          <ScreenClean />
          <SleepOverlay />
          <PwaUpdate />
          <RearSync />
          <OnScreenKeyboard target={keyboardTarget} onClose={closeKeyboard} />
        </div>
      </div>
    </>
  );
}

export default App;
