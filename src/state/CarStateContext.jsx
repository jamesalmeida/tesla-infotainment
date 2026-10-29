import { createContext, useContext, useMemo, useReducer } from 'react';
import { carReducer, initialCarState, isCameraForced } from './carState';

const CarStateContext = createContext(null);
const CarActionsContext = createContext(null);

export function CarStateProvider({ children }) {
  const [state, dispatch] = useReducer(carReducer, initialCarState);

  // Actions never change, so components that only act on the car don't re-render with it.
  const actions = useMemo(
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

  const value = useMemo(() => ({ ...state, isCameraForced: isCameraForced(state) }), [state]);

  return (
    <CarActionsContext.Provider value={actions}>
      <CarStateContext.Provider value={value}>{children}</CarStateContext.Provider>
    </CarActionsContext.Provider>
  );
}

export const useCarState = () => useContext(CarStateContext);
export const useCarActions = () => useContext(CarActionsContext);
