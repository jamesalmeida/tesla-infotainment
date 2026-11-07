import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  carReducer,
  initialCarState,
  type AppId,
  type Autopilot,
  type CabinSettings,
  type CarAction,
  type CarState,
  type ClimateMode,
  type ClimateOptions,
  type ClipSource,
  type Compartment,
  type DefrostWindow,
  type DisplaySettings,
  type Gear,
  type ModalId,
  type OverlayMode,
  type Pedal,
  type SeatId,
  type SeatKind,
  type SettingsPanel,
  type Surface,
  type TemperatureZone,
  type VehicleSettings,
} from './carState';
import { loadPersistedState, savePersistedState } from './persistence';

export interface CarActions {
  selectGear: (gear: Gear) => void;
  toggleApp: (app: AppId) => void;
  closeSurface: () => void;
  restoreSurface: (surface: Surface) => void;
  toggleCamera: () => void;
  openSettings: (panel: SettingsPanel) => void;
  setSettings: (patch: Partial<VehicleSettings>) => void;
  setDisplay: (patch: Partial<DisplaySettings>) => void;
  toggleModal: (modal: ModalId) => void;
  closeModal: () => void;
  toggleCompartment: (compartment: Compartment) => void;
  toggleLock: () => void;
  toggleLeftSignal: () => void;
  toggleRightSignal: () => void;
  toggleHazards: () => void;
  stepTemperature: (zone: TemperatureZone, delta: number) => void;
  setCabin: (patch: Partial<CabinSettings>) => void;
  setClimateOptions: (options: ClimateOptions) => void;
  toggleDefrost: (window: DefrostWindow) => void;
  cycleSeat: (seat: SeatId, kind: SeatKind) => void;
  toggleHeatAuto: () => void;
  toggleClimateMode: (mode: ClimateMode) => void;
  setVolume: (volume: number) => void;
  selectProfile: (id: number) => void;
  showNotice: (message: string) => void;
  dismissNotice: () => void;
  clearNotifications: () => void;
  setPedal: (pedal: Pedal) => void;
  tick: (seconds: number) => void;
  plugIn: () => void;
  unplug: () => void;
  toggleCharging: () => void;
  toggleChargePort: () => void;
  resetTrip: () => void;
  engageAutopilot: (mode: Exclude<Autopilot, 'off'>) => void;
  disengageAutopilot: () => void;
  triggerSentryAlarm: () => void;
  clearSentryAlarm: () => void;
  saveDashcamClip: (source: Exclude<ClipSource, 'sentry'>) => void;
  enterMode: (mode: OverlayMode) => void;
  exitMode: () => void;
  toggleGlovebox: () => void;
  walkAway: () => void;
}

interface CarStore {
  getState: () => CarState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: CarAction) => void;
}

function createCarStore(initial: CarState): CarStore {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (action) => {
      const next = carReducer(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const createActions = ({ dispatch }: CarStore): CarActions => ({
  selectGear: (gear) => dispatch({ type: 'gear/select', gear }),
  toggleApp: (app) => dispatch({ type: 'app/toggle', app }),
  closeSurface: () => dispatch({ type: 'surface/close' }),
  restoreSurface: (surface) => dispatch({ type: 'surface/restore', surface }),
  toggleCamera: () => dispatch({ type: 'camera/toggle' }),
  openSettings: (panel) => dispatch({ type: 'settings/open', panel }),
  setSettings: (patch) => dispatch({ type: 'settings/set', patch }),
  setDisplay: (patch) => dispatch({ type: 'display/set', patch }),
  toggleModal: (modal) => dispatch({ type: 'modal/toggle', modal }),
  closeModal: () => dispatch({ type: 'modal/close' }),
  toggleCompartment: (compartment) => dispatch({ type: 'compartment/toggle', compartment }),
  toggleLock: () => dispatch({ type: 'lock/toggle' }),
  toggleLeftSignal: () => dispatch({ type: 'signal/left' }),
  toggleRightSignal: () => dispatch({ type: 'signal/right' }),
  toggleHazards: () => dispatch({ type: 'signal/hazards' }),
  stepTemperature: (zone, delta) => dispatch({ type: 'climate/temperature', zone, delta }),
  setCabin: (patch) => dispatch({ type: 'climate/cabin', patch }),
  setClimateOptions: (options) => dispatch({ type: 'climate/options', options }),
  toggleDefrost: (window) => dispatch({ type: 'climate/defrost', window }),
  cycleSeat: (seat, kind) => dispatch({ type: 'climate/seat', seat, kind }),
  toggleHeatAuto: () => dispatch({ type: 'climate/heat-auto' }),
  toggleClimateMode: (mode) => dispatch({ type: 'climate/mode', mode }),
  setVolume: (volume) => dispatch({ type: 'volume/set', volume }),
  selectProfile: (id) => dispatch({ type: 'profile/select', id }),
  showNotice: (message) => dispatch({ type: 'notice/show', message }),
  dismissNotice: () => dispatch({ type: 'notice/dismiss' }),
  clearNotifications: () => dispatch({ type: 'notifications/clear' }),
  setPedal: (pedal) => dispatch({ type: 'pedal/set', pedal }),
  tick: (seconds) => dispatch({ type: 'sim/tick', seconds }),
  plugIn: () => dispatch({ type: 'charge/plug' }),
  unplug: () => dispatch({ type: 'charge/unplug' }),
  toggleCharging: () => dispatch({ type: 'charge/toggle' }),
  toggleChargePort: () => dispatch({ type: 'charge-port/toggle' }),
  resetTrip: () => dispatch({ type: 'trip/reset' }),
  engageAutopilot: (mode) => dispatch({ type: 'autopilot/engage', mode }),
  disengageAutopilot: () => dispatch({ type: 'autopilot/disengage' }),
  triggerSentryAlarm: () => dispatch({ type: 'sentry/alarm' }),
  clearSentryAlarm: () => dispatch({ type: 'sentry/clear' }),
  saveDashcamClip: (source) => dispatch({ type: 'dashcam/save', source }),
  enterMode: (mode) => dispatch({ type: 'mode/enter', mode }),
  exitMode: () => dispatch({ type: 'mode/exit' }),
  toggleGlovebox: () => dispatch({ type: 'glovebox/toggle' }),
  walkAway: () => dispatch({ type: 'lock/walk-away' }),
});

interface CarContextValue {
  store: CarStore;
  actions: CarActions;
}

const CarContext = createContext<CarContextValue | null>(null);

export function CarStateProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: CarState;
}) {
  const [store] = useState(() => {
    const created = createCarStore(initialState ?? loadPersistedState(initialCarState));
    created.subscribe(() => savePersistedState(created.getState()));
    return created;
  });

  // Actions never change, so components that only act on the car don't re-render with it.
  const value = useMemo(() => ({ store, actions: createActions(store) }), [store]);

  return <CarContext.Provider value={value}>{children}</CarContext.Provider>;
}

const useCarContext = (): CarContextValue => {
  const value = useContext(CarContext);
  if (!value) throw new Error('Car hooks must be used inside <CarStateProvider>');
  return value;
};

// Subscribes to one slice, so a component only re-renders when that slice changes.
// The selector must return a primitive or an existing object from the state.
export const useCar = <T,>(selector: (state: CarState) => T): T => {
  const { store } = useCarContext();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
};

export const useCarActions = (): CarActions => useCarContext().actions;
