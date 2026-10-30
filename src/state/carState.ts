export const MIN_TEMPERATURE = 60;
export const MAX_TEMPERATURE = 90;

export type Gear = 'P' | 'R' | 'N' | 'D';

// Apps that open in the slide-up panel over the map.
export type AppId =
  | 'apple-music'
  | 'arcade'
  | 'bluetooth'
  | 'calendar'
  | 'camera'
  | 'car-settings'
  | 'dashcam'
  | 'podcasts'
  | 'toybox';

export type ModalId = 'app-shelf';

export type Compartment = 'frunk' | 'trunk';

export interface CarState {
  gear: Gear;
  isSliderOpen: boolean;
  activeApp: AppId | null;
  isWifiMenuOpen: boolean;
  isShelfOpen: boolean;
  activeModal: ModalId | null;
  openCompartment: Compartment | null;
  leftSignal: boolean;
  rightSignal: boolean;
  temperature: number;
  volume: number;
}

export type CarAction =
  | { type: 'gear/select'; gear: Gear }
  | { type: 'app/toggle'; app: AppId }
  | { type: 'slider/close' }
  | { type: 'camera/toggle' }
  | { type: 'settings/openWifi' }
  | { type: 'settings/leaveWifi' }
  | { type: 'shelf/toggle' }
  | { type: 'modal/close' }
  | { type: 'compartment/toggle'; compartment: Compartment }
  | { type: 'signal/left' }
  | { type: 'signal/right' }
  | { type: 'signal/hazards' }
  | { type: 'temperature/step'; delta: number }
  | { type: 'volume/set'; volume: number };

export const initialCarState: CarState = {
  gear: 'P',
  // The slide-up panel over the map, and which app it shows.
  isSliderOpen: false,
  activeApp: null,
  // Opening Settings from the map's wifi icon jumps straight to the Wifi panel.
  isWifiMenuOpen: false,
  isShelfOpen: false,
  activeModal: null,
  // 'frunk', 'trunk' or null; only one can be open at a time.
  openCompartment: null,
  leftSignal: false,
  rightSignal: false,
  temperature: 70,
  volume: 50,
};

// Reverse forces the backup camera open until the car leaves R.
export const isCameraForced = (state: CarState): boolean => state.gear === 'R';

const closeSlider = (state: CarState): CarState => ({
  ...state,
  isSliderOpen: false,
  activeApp: null,
  isWifiMenuOpen: false,
});

export function carReducer(state: CarState, action: CarAction): CarState {
  switch (action.type) {
    case 'gear/select':
      return action.gear === 'R'
        ? { ...state, gear: 'R', activeApp: 'camera', isSliderOpen: true }
        : { ...state, gear: action.gear, activeApp: null, isSliderOpen: false };

    // A bottom bar app icon: opens that app, or closes it if it is already showing.
    case 'app/toggle': {
      const forced = isCameraForced(state);
      if (state.isSliderOpen && state.activeApp === action.app && !forced) {
        return closeSlider(state);
      }
      if (!forced || action.app === 'camera') {
        return { ...state, isWifiMenuOpen: false, activeApp: action.app, isSliderOpen: true };
      }
      return state;
    }

    case 'slider/close':
      return isCameraForced(state) ? state : closeSlider(state);

    case 'camera/toggle':
      return state.isSliderOpen && state.activeApp === 'camera'
        ? { ...state, activeApp: null, isSliderOpen: false }
        : { ...state, activeApp: 'camera', isSliderOpen: true };

    case 'settings/openWifi':
      return isCameraForced(state)
        ? state
        : { ...state, isWifiMenuOpen: true, activeApp: 'car-settings', isSliderOpen: true };

    case 'settings/leaveWifi':
      return { ...state, isWifiMenuOpen: false };

    case 'shelf/toggle':
      return {
        ...state,
        isShelfOpen: !state.isShelfOpen,
        activeModal: state.isShelfOpen ? null : 'app-shelf',
      };

    case 'modal/close':
      return { ...state, activeModal: null };

    case 'compartment/toggle':
      return {
        ...state,
        openCompartment: state.openCompartment === action.compartment ? null : action.compartment,
      };

    case 'signal/left':
      return { ...state, leftSignal: !state.leftSignal, rightSignal: false };

    case 'signal/right':
      return { ...state, rightSignal: !state.rightSignal, leftSignal: false };

    // Hazards turn both signals on, or off if both are already on.
    case 'signal/hazards': {
      const on = !(state.leftSignal && state.rightSignal);
      return { ...state, leftSignal: on, rightSignal: on };
    }

    case 'temperature/step':
      return {
        ...state,
        temperature: Math.min(
          MAX_TEMPERATURE,
          Math.max(MIN_TEMPERATURE, state.temperature + action.delta),
        ),
      };

    case 'volume/set':
      return { ...state, volume: action.volume };

    default: {
      // Unreachable for typed callers; still guards against untyped dispatches.
      const unknown: { type: string } = action;
      throw new Error(`Unknown car action: ${unknown.type}`);
    }
  }
}
