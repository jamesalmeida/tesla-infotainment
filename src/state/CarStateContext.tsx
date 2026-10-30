import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  carReducer,
  initialCarState,
  isCameraForced,
  type AppId,
  type CarState,
  type Gear,
} from './carState';

export interface CarStateValue extends CarState {
  isCameraForced: boolean;
}

export interface CarActions {
  selectGear: (gear: Gear) => void;
  toggleApp: (app: AppId) => void;
  closeSlider: () => void;
  toggleCamera: () => void;
  openWifiSettings: () => void;
  leaveWifiSettings: () => void;
  toggleShelf: () => void;
  closeModal: () => void;
  toggleFrunk: () => void;
  toggleTrunk: () => void;
  toggleLeftSignal: () => void;
  toggleRightSignal: () => void;
  toggleHazards: () => void;
  stepTemperature: (delta: number) => void;
  setVolume: (volume: number) => void;
}

const CarStateContext = createContext<CarStateValue | null>(null);
const CarActionsContext = createContext<CarActions | null>(null);

export function CarStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(carReducer, initialCarState);

  // Actions never change, so components that only act on the car don't re-render with it.
  const actions = useMemo<CarActions>(
    () => ({
      selectGear: (gear) => dispatch({ type: 'gear/select', gear }),
      toggleApp: (app) => dispatch({ type: 'app/toggle', app }),
      closeSlider: () => dispatch({ type: 'slider/close' }),
      toggleCamera: () => dispatch({ type: 'camera/toggle' }),
      openWifiSettings: () => dispatch({ type: 'settings/openWifi' }),
      leaveWifiSettings: () => dispatch({ type: 'settings/leaveWifi' }),
      toggleShelf: () => dispatch({ type: 'shelf/toggle' }),
      closeModal: () => dispatch({ type: 'modal/close' }),
      toggleFrunk: () => dispatch({ type: 'compartment/toggle', compartment: 'frunk' }),
      toggleTrunk: () => dispatch({ type: 'compartment/toggle', compartment: 'trunk' }),
      toggleLeftSignal: () => dispatch({ type: 'signal/left' }),
      toggleRightSignal: () => dispatch({ type: 'signal/right' }),
      toggleHazards: () => dispatch({ type: 'signal/hazards' }),
      stepTemperature: (delta) => dispatch({ type: 'temperature/step', delta }),
      setVolume: (volume) => dispatch({ type: 'volume/set', volume }),
    }),
    [],
  );

  const value = useMemo<CarStateValue>(
    () => ({ ...state, isCameraForced: isCameraForced(state) }),
    [state],
  );

  return (
    <CarActionsContext.Provider value={actions}>
      <CarStateContext.Provider value={value}>{children}</CarStateContext.Provider>
    </CarActionsContext.Provider>
  );
}

export const useCarState = (): CarStateValue => {
  const value = useContext(CarStateContext);
  if (!value) throw new Error('useCarState must be used inside <CarStateProvider>');
  return value;
};

export const useCarActions = (): CarActions => {
  const value = useContext(CarActionsContext);
  if (!value) throw new Error('useCarActions must be used inside <CarStateProvider>');
  return value;
};
