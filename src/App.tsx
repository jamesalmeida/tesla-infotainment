import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
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
import {
  DRIVE_ELEVATION,
  PANEL_ELEVATION,
  PARK_VIEW_AZIMUTH,
  PARK_VIEW_ELEVATION,
} from './components/VehicleModel/vehiclePose';
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
import { PedalDeck } from './components/PedalDeck/PedalDeck';
import { ParkNavCard, ParkViewHandle, ParkViewMapCorner } from './components/ParkView/ParkView';
import { DrivingVisualization } from './components/DrivingVisualization/DrivingVisualization';
import { Modal } from './components/Modal/Modal';
import { AppShelf } from './components/AppShelf/AppShelf';
import VerticalSliderPanel from './components/VerticalSliderPanel/VerticalSliderPanel';
import BtmNavBar from './components/BtmNavBar/BtmNavBar';
import { BrightnessOverlay } from './components/BrightnessOverlay/BrightnessOverlay';
import CarWashMode from './components/Apps/CarSettings/components/CarWashMode/CarWashMode';
import { CarStatus, Pedals } from './components/CarStatus/CarStatus';
import { ChargeStatus } from './components/ChargeStatus/ChargeStatus';
import { CompartmentControls } from './components/CarStatus/CompartmentControls';
import { ClimatePanel } from './components/Climate/ClimatePanel';
import { DogModeDisplay } from './components/Climate/DogModeDisplay';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { CarUnavailable, DisplayCrashed } from './components/ErrorBoundary/Fallbacks';
import { DisplayEffects } from './components/DisplayEffects/DisplayEffects';
import { DrivePinPrompt } from './components/DrivePinPrompt/DrivePinPrompt';
import { Emergency } from './components/Emergency/Emergency';
import { FullscreenPrompt } from './components/FullscreenPrompt/FullscreenPrompt';
import { Notice } from './components/Notice/Notice';
import { PwaUpdate } from './components/PwaUpdate/PwaUpdate';
import { RearSync } from './components/RearDisplay/RearSync';
import { RestartOverlay } from './components/RestartOverlay/RestartOverlay';
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
const STACKED_LEFT_PANEL_SIZE = 50;
// A drag has to go this far past the default before it counts as making room for the car.
const CLOSE_APP_DRAG_MARGIN = 3;
// Dragged this far across in Park, the car panel takes the whole screen.
const PARK_VIEW_ENTER_SIZE = 75;
// How far, in pixels, a press on the grabber can move and still be a tap.
const TAP_TRAVEL = 6;
// How long a tap on the grabber takes to slide the car panel across.
const PARK_VIEW_SLIDE_MS = 380;

function App() {
  return (
    <ErrorBoundary fallback={() => <DisplayCrashed />}>
      <CarStateProvider>
        <Display />
      </CarStateProvider>
    </ErrorBoundary>
  );
}

// In Park View the car spans about half the screen's width, as on the car. Its canvas covers
// the whole panel, and the fit only looks at the canvas's height, so the margin follows the
// panel's shape: a wide desktop panel needs a closer camera than an iPad's.
const PARK_VIEW_CAR_WIDTH = 1.57;
const parkViewFitMargin = (aspect: number) => PARK_VIEW_CAR_WIDTH / aspect;

function VehicleView({ onSettled, wide }: { onSettled: () => void; wide: boolean }) {
  const pose = useCar(vehiclePose);
  const state = useCar((current) => current);
  const paint = useCar((current) => current.settings.paint);
  const speed = useCar((current) => current.speed);
  const leftLit = useCar(leftSignalLit);
  const rightLit = useCar(rightSignalLit);
  const blinkOn = useBlink(leftLit || rightLit);
  const lights = carLightState(state, blinkOn);
  const { toggleDoor } = useCarActions();
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
            doors={state.doors}
            onDoorToggle={toggleDoor}
            onReady={onSettled}
            lights={lights}
            paint={paint}
            speed={speed}
            fitMargin={wide ? parkViewFitMargin : 1}
            azimuth={wide && pose !== 'drive' ? PARK_VIEW_AZIMUTH : undefined}
            elevation={
              pose === 'drive' ? DRIVE_ELEVATION : wide ? PARK_VIEW_ELEVATION : PANEL_ELEVATION
            }
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

const LeftPanelContent = memo(function LeftPanelContent({
  onCarSettled,
  isParkView,
  onLeaveParkView,
}: {
  onCarSettled: () => void;
  isParkView: boolean;
  onLeaveParkView: () => void;
}) {
  return (
    <>
      <CarStatus />
      <CompartmentControls />
      <ChargeStatus />
      <div className="vehicleArea">
        <VehicleView onSettled={onCarSettled} wide={isParkView} />
        {!isParkView && <Pedals />}
      </div>
      {/* In Park View the car covers the whole panel, so the pedals sit on this row instead. */}
      <div className="carBottomRow">
        <CarCards />
        {isParkView && <ParkNavCard onExit={onLeaveParkView} />}
        {isParkView && <Pedals />}
      </div>
      <DriveStrip />
      {isParkView && (
        <>
          <ParkViewMapCorner onExit={onLeaveParkView} />
          <ParkViewHandle onExit={onLeaveParkView} />
        </>
      )}
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

  // The same tree serves every mode, with only the sizes changing. Rendering a different one
  // would remount the map and the audio, so rotating or folding would lose the route and
  // stop playback.
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (hasViewSwitch) panel.resize(visibleView === 'car' ? '100%' : '0%');
    else if (isStacked) panel.resize(`${STACKED_LEFT_PANEL_SIZE}%`);
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
    // Pulling the car panel most of the way across in Park opens the full Park view.
    if (meta.isUserInteraction && parked && leftSize >= PARK_VIEW_ENTER_SIZE) setParkView(true);
  };

  const leaveParkView = useCallback(() => setParkView(false), []);

  // A tap on the grabber, rather than a drag, opens the full Park view in one go, as on the
  // car. Only a press that barely moves counts; anything longer was a resize.
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const slideFrame = useRef<number | null>(null);
  useEffect(() => () => cancelAnimationFrame(slideFrame.current ?? 0), []);

  // The panel slides across to the full width, then Park view takes over. With reduced
  // motion it goes straight there.
  const openParkView = () => {
    if (!parked || slideFrame.current !== null) return;
    if (isOpen) closeSurface();
    const panel = leftPanelRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!panel || reduceMotion) {
      setParkView(true);
      return;
    }
    const from = panel.getSize().asPercentage;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / PARK_VIEW_SLIDE_MS);
      const eased = 1 - (1 - progress) ** 3;
      panel.resize(`${from + (100 - from) * eased}%`);
      if (progress < 1) {
        slideFrame.current = requestAnimationFrame(step);
      } else {
        slideFrame.current = null;
        setParkView(true);
      }
    };
    slideFrame.current = requestAnimationFrame(step);
  };
  const separatorTap = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      pressStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      const start = pressStart.current;
      pressStart.current = null;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= TAP_TRAVEL) {
        openParkView();
      }
    },
    onPointerCancel: () => {
      pressStart.current = null;
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openParkView();
      }
    },
  };

  return (
    <>
      {hasViewSwitch && <StackedViewSwitch view={visibleView} onChange={setStackedView} />}
      <Group
        defaultLayout={defaultLayout}
        onLayoutChanged={handleLayoutChanged}
        orientation={isStacked ? 'vertical' : 'horizontal'}
        className={`horizontalPanelGroup ${showParkView ? 'parkView' : ''}`}
      >
        <Panel
          id={LEFT_PANEL_ID}
          defaultSize={`${isStacked ? STACKED_LEFT_PANEL_SIZE : DEFAULT_LEFT_PANEL_SIZE}%`}
          minSize={isStacked ? '0%' : `${DEFAULT_LEFT_PANEL_SIZE}%`}
          maxSize="100%"
          className="leftPanel"
          panelRef={leftPanelRef}
        >
          <LeftPanelContent
            onCarSettled={onCarSettled}
            isParkView={showParkView}
            onLeaveParkView={leaveParkView}
          />
        </Panel>
        {!isStacked && !showParkView && (
          <Separator className="panelResizeHandle" {...separatorTap} />
        )}
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
  const { showNotice } = useCarActions();

  // One quiet tip on the first visit, once the loading screen is gone.
  useEffect(() => {
    if (isLoading || safeStorage.getItem('tesla-tips-seen') === '1') return;
    const timer = setTimeout(() => {
      showNotice('Shift + ? shows shortcuts. Brake, then swipe the drive strip to shift.');
      safeStorage.setItem('tesla-tips-seen', '1');
    }, 1200);
    return () => clearTimeout(timer);
  }, [isLoading, showNotice]);

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
          <FullscreenPrompt />
          <RearSync />
          <OnScreenKeyboard target={keyboardTarget} onClose={closeKeyboard} />
        </div>
      </div>
      <PedalDeck />
    </>
  );
}

export default App;
