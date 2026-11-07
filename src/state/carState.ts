import { isAppId, isParkedOnly, pausesOutOfPark, APPS, type AppId } from '../apps/registry';

export type { AppId };

export const MIN_TEMPERATURE = 60;
export const MAX_TEMPERATURE = 90;
// Above this speed the car refuses Park and Reverse.
export const MAX_SHIFT_SPEED = 5;
export const MAX_SPEED = 90;
export const MAX_REVERSE_SPEED = 15;
export const FULL_RANGE_MILES = 310;
export const MAX_NOTIFICATIONS = 20;

// mph per second.
const ACCELERATION_RATE = { chill: 6, standard: 10, sport: 14 } as const;
const BRAKING_RATE = 18;
const REGEN_RATE = 3;
const COAST_RATE = 1;
// About 250 Wh per mile on a 75 kWh pack.
const PERCENT_PER_MILE = 100 / FULL_RANGE_MILES;
// A fast public charger, sped up so a demo session finishes in a minute or two.
const CHARGE_PERCENT_PER_SECOND = 1;

export type Gear = 'P' | 'R' | 'N' | 'D';

export const SETTINGS_PANELS = [
  'Controls',
  'Dynamics',
  'Charging',
  'Autopilot',
  'Locks',
  'Lights',
  'Display',
  'Trips',
  'Navigation',
  'Safety',
  'Service',
  'Software',
  'Wifi',
] as const;

export type SettingsPanel = (typeof SETTINGS_PANELS)[number];

// What is showing over the map. One value, so "open with no app" can't exist.
export type Surface =
  | { kind: 'closed' }
  | { kind: 'app'; app: Exclude<AppId, 'camera' | 'car-settings'> }
  | { kind: 'settings'; panel: SettingsPanel }
  | { kind: 'camera' };

export type ModalId = 'app-shelf' | 'shortcuts';

export type Compartment = 'frunk' | 'trunk';

export type TurnSignal = 'off' | 'left' | 'right';

export type Wipers = { mode: 'off' } | { mode: 'auto' } | { mode: 'manual'; speed: 1 | 2 | 3 | 4 };

export type Headlights = 'off' | 'parking' | 'on' | 'auto';

export type ChildLock = 'off' | 'left' | 'right' | 'both';

export type Acceleration = keyof typeof ACCELERATION_RATE;

export type Pedal = 'none' | 'accelerate' | 'brake';

export type ChargeState = 'unplugged' | 'charging' | 'complete';

export type VehiclePower = 'parked' | 'driving' | 'charging';

// Vehicle settings live here rather than in their panels, so they outlive the panel
// and anything else in the app can read them.
export interface VehicleSettings {
  headlights: Headlights;
  highBeams: boolean;
  foldMirrors: boolean;
  windowLock: boolean;
  childLock: ChildLock;
  wipers: Wipers;
  dashcam: boolean;
  sentry: boolean;
  driveAwayLock: boolean;
  unlockOnPark: boolean;
  acceleration: Acceleration;
  chargeLimit: number;
}

export interface DisplaySettings {
  // 0-100, the value the user chose. Auto overrides it without overwriting it.
  brightness: number;
  autoBrightness: boolean;
}

export interface Notice {
  id: number;
  message: string;
  // Milliseconds since the epoch, for the notification history.
  time: number;
}

export interface CarState {
  gear: Gear;
  speed: number;
  pedal: Pedal;
  batteryPercent: number;
  odometerMiles: number;
  tripMiles: number;
  chargeState: ChargeState;
  surface: Surface;
  // Reverse takes over the screen; this is what comes back when it ends.
  surfaceBeforeReverse: Surface | null;
  activeModal: ModalId | null;
  // Only one can be open at a time.
  openCompartment: Compartment | null;
  isLocked: boolean;
  signal: TurnSignal;
  // Hazards sit on top of the signal instead of replacing it.
  hazards: boolean;
  temperature: number;
  volume: number;
  activeProfileId: number;
  settings: VehicleSettings;
  display: DisplaySettings;
  // The newest message, on screen for a moment.
  notice: Notice | null;
  // Everything shown recently, newest first, for the bell in Settings.
  notifications: Notice[];
}

export type CarAction =
  | { type: 'gear/select'; gear: Gear }
  | { type: 'speed/set'; speed: number }
  | { type: 'pedal/set'; pedal: Pedal }
  | { type: 'sim/tick'; seconds: number }
  | { type: 'charge/plug' }
  | { type: 'charge/unplug' }
  | { type: 'trip/reset' }
  | { type: 'app/toggle'; app: AppId }
  | { type: 'surface/close' }
  | { type: 'surface/restore'; surface: Surface }
  | { type: 'camera/toggle' }
  | { type: 'settings/open'; panel: SettingsPanel }
  | { type: 'settings/set'; patch: Partial<VehicleSettings> }
  | { type: 'display/set'; patch: Partial<DisplaySettings> }
  | { type: 'modal/toggle'; modal: ModalId }
  | { type: 'modal/close' }
  | { type: 'compartment/toggle'; compartment: Compartment }
  | { type: 'lock/toggle' }
  | { type: 'signal/left' }
  | { type: 'signal/right' }
  | { type: 'signal/hazards' }
  | { type: 'temperature/step'; delta: number }
  | { type: 'volume/set'; volume: number }
  | { type: 'profile/select'; id: number }
  | { type: 'notice/show'; message: string }
  | { type: 'notice/dismiss' }
  | { type: 'notifications/clear' };

export const initialCarState: CarState = {
  gear: 'P',
  speed: 0,
  pedal: 'none',
  batteryPercent: 69,
  odometerMiles: 12480,
  tripMiles: 0,
  chargeState: 'unplugged',
  surface: { kind: 'closed' },
  surfaceBeforeReverse: null,
  activeModal: null,
  openCompartment: null,
  isLocked: true,
  signal: 'off',
  hazards: false,
  temperature: 70,
  volume: 50,
  activeProfileId: 1,
  settings: {
    headlights: 'auto',
    highBeams: false,
    foldMirrors: false,
    windowLock: false,
    childLock: 'off',
    wipers: { mode: 'auto' },
    dashcam: false,
    sentry: false,
    driveAwayLock: true,
    unlockOnPark: true,
    acceleration: 'standard',
    chargeLimit: 80,
  },
  display: { brightness: 100, autoBrightness: false },
  notice: null,
  notifications: [],
};

/* -------------------- Selectors -------------------- */

// Reverse forces the backup camera open until the car leaves R.
export const isCameraForced = (state: CarState): boolean => state.gear === 'R';
export const isDriving = (state: CarState): boolean => state.gear === 'D';
export const isParked = (state: CarState): boolean => state.gear === 'P';
export const isPanelOpen = (state: CarState): boolean => state.surface.kind !== 'closed';
export const leftSignalLit = (state: CarState): boolean => state.hazards || state.signal === 'left';
export const rightSignalLit = (state: CarState): boolean =>
  state.hazards || state.signal === 'right';

export const vehiclePose = (state: CarState): 'park' | 'drive' | Compartment =>
  isDriving(state) ? 'drive' : (state.openCompartment ?? 'park');

export const rangeMiles = (state: CarState): number =>
  Math.round((state.batteryPercent / 100) * FULL_RANGE_MILES);

export const vehiclePower = (state: CarState): VehiclePower => {
  if (state.chargeState !== 'unplugged') return 'charging';
  return isParked(state) ? 'parked' : 'driving';
};

// The loop only runs while something is actually changing.
export const isSimulationActive = (state: CarState): boolean =>
  state.speed > 0 || state.pedal !== 'none' || state.chargeState === 'charging';

export const surfaceApp = (surface: Surface): AppId | null => {
  switch (surface.kind) {
    case 'closed':
      return null;
    case 'camera':
      return 'camera';
    case 'settings':
      return 'car-settings';
    case 'app':
      return surface.app;
  }
};

export const activeApp = (state: CarState): AppId | null => surfaceApp(state.surface);

const surfaceFor = (app: AppId): Surface => {
  switch (app) {
    case 'camera':
      return { kind: 'camera' };
    case 'car-settings':
      return { kind: 'settings', panel: 'Controls' };
    default:
      return { kind: 'app', app };
  }
};

export type Permission = { allowed: true } | { allowed: false; reason: string };

const ALLOWED: Permission = { allowed: true };

// Every "can this happen right now?" rule, so features don't each invent their own check.
export function canShift(state: CarState, gear: Gear): Permission {
  if (state.chargeState !== 'unplugged' && gear !== 'P') {
    return { allowed: false, reason: 'Unplug the charge cable before driving' };
  }
  if (state.speed > MAX_SHIFT_SPEED && (gear === 'P' || gear === 'R')) {
    return {
      allowed: false,
      reason: `Slow down to shift into ${gear === 'P' ? 'Park' : 'Reverse'}`,
    };
  }
  return ALLOWED;
}

export function canOpenApp(state: CarState, app: AppId): Permission {
  if (isParkedOnly(app) && !isParked(state)) {
    return { allowed: false, reason: `${APPS[app].label} is only available in Park` };
  }
  return ALLOWED;
}

export function canOpenCompartment(state: CarState, compartment: Compartment): Permission {
  if (!isParked(state)) {
    return { allowed: false, reason: `Shift to Park to open the ${compartment}` };
  }
  return ALLOWED;
}

/* -------------------- Transitions -------------------- */

const notify = (state: CarState, message: string): CarState => {
  const notice = {
    id: (state.notifications[0]?.id ?? 0) + 1,
    message,
    time: Date.now(),
  };
  return {
    ...state,
    notice,
    notifications: [notice, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
  };
};

// The one door every surface change goes through: nothing replaces the forced camera.
const setSurface = (state: CarState, surface: Surface): CarState =>
  isCameraForced(state) ? state : { ...state, surface };

function shift(state: CarState, gear: Gear): CarState {
  let next: CarState = {
    ...state,
    gear,
    // Closures can only be open in Park.
    openCompartment: gear === 'P' ? state.openCompartment : null,
  };

  if (gear === 'R') {
    next = {
      ...next,
      surface: { kind: 'camera' },
      surfaceBeforeReverse: state.surface,
      activeModal: null,
    };
  } else if (state.gear === 'R') {
    next = {
      ...next,
      surface: state.surfaceBeforeReverse ?? { kind: 'closed' },
      surfaceBeforeReverse: null,
    };
  }

  if (gear === 'D' && state.settings.driveAwayLock) next = { ...next, isLocked: true };
  if (gear === 'P' && state.settings.unlockOnPark) next = { ...next, isLocked: false };

  // An app that only runs in Park can't survive leaving it, unless it can wait paused.
  const app = surfaceApp(next.surface);
  if (app && !pausesOutOfPark(app)) {
    const permission = canOpenApp(next, app);
    if (!permission.allowed) {
      return notify({ ...next, surface: { kind: 'closed' } }, permission.reason);
    }
  }
  return next;
}

const approach = (value: number, target: number, step: number) =>
  value < target ? Math.min(target, value + step) : Math.max(target, value - step);

function nextSpeed(state: CarState, seconds: number): number {
  const canPropel = state.gear === 'D' || state.gear === 'R';
  const topSpeed = state.gear === 'R' ? MAX_REVERSE_SPEED : MAX_SPEED;
  const hasCharge = state.batteryPercent > 0;

  if (state.pedal === 'brake') return approach(state.speed, 0, BRAKING_RATE * seconds);
  if (state.pedal === 'accelerate' && canPropel && hasCharge) {
    const rate = ACCELERATION_RATE[state.settings.acceleration];
    return approach(state.speed, topSpeed, rate * seconds);
  }
  // Regen slows the car in gear; in Neutral it only coasts.
  return approach(state.speed, 0, (canPropel ? REGEN_RATE : COAST_RATE) * seconds);
}

function tick(state: CarState, seconds: number): CarState {
  if (state.chargeState === 'charging') {
    const batteryPercent = Math.min(
      state.settings.chargeLimit,
      state.batteryPercent + CHARGE_PERCENT_PER_SECOND * seconds,
    );
    if (batteryPercent < state.settings.chargeLimit) return { ...state, batteryPercent };
    return notify({ ...state, batteryPercent, chargeState: 'complete' }, 'Charging complete');
  }

  const speed = nextSpeed(state, seconds);
  const miles = ((state.speed + speed) / 2) * (seconds / 3600);
  const batteryPercent = Math.max(0, state.batteryPercent - miles * PERCENT_PER_MILE);
  return {
    ...state,
    speed,
    batteryPercent,
    odometerMiles: state.odometerMiles + miles,
    tripMiles: state.tripMiles + miles,
  };
}

export function carReducer(state: CarState, action: CarAction): CarState {
  switch (action.type) {
    case 'gear/select': {
      if (action.gear === state.gear) return state;
      const permission = canShift(state, action.gear);
      return permission.allowed ? shift(state, action.gear) : notify(state, permission.reason);
    }

    case 'speed/set':
      return { ...state, speed: Math.max(0, action.speed) };

    case 'pedal/set':
      return state.pedal === action.pedal ? state : { ...state, pedal: action.pedal };

    case 'sim/tick':
      return tick(state, action.seconds);

    case 'charge/plug':
      if (!isParked(state)) return notify(state, 'Shift to Park to charge');
      if (state.chargeState !== 'unplugged') return state;
      return state.batteryPercent >= state.settings.chargeLimit
        ? { ...state, chargeState: 'complete' }
        : { ...state, chargeState: 'charging' };

    case 'charge/unplug':
      return { ...state, chargeState: 'unplugged' };

    case 'trip/reset':
      return { ...state, tripMiles: 0 };

    // A bottom bar app icon: opens that app, or closes it if it is already showing.
    case 'app/toggle': {
      if (isCameraForced(state)) return state;
      if (surfaceApp(state.surface) === action.app) return setSurface(state, { kind: 'closed' });
      const permission = canOpenApp(state, action.app);
      return permission.allowed
        ? setSurface(state, surfaceFor(action.app))
        : notify(state, permission.reason);
    }

    case 'surface/close':
      return setSurface(state, { kind: 'closed' });

    // Back and forward in the browser. Guards still apply: a link can't bypass Park.
    case 'surface/restore': {
      const app = surfaceApp(action.surface);
      if (app && !canOpenApp(state, app).allowed) return state;
      return setSurface(state, action.surface);
    }

    case 'camera/toggle':
      return setSurface(
        state,
        state.surface.kind === 'camera' ? { kind: 'closed' } : { kind: 'camera' },
      );

    case 'settings/open':
      return setSurface(state, { kind: 'settings', panel: action.panel });

    case 'settings/set':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'display/set':
      return { ...state, display: { ...state.display, ...action.patch } };

    case 'modal/toggle':
      if (state.activeModal === action.modal) return { ...state, activeModal: null };
      return isCameraForced(state) ? state : { ...state, activeModal: action.modal };

    case 'modal/close':
      return { ...state, activeModal: null };

    case 'compartment/toggle': {
      if (state.openCompartment === action.compartment) {
        return { ...state, openCompartment: null };
      }
      const permission = canOpenCompartment(state, action.compartment);
      return permission.allowed
        ? { ...state, openCompartment: action.compartment }
        : notify(state, permission.reason);
    }

    case 'lock/toggle':
      return { ...state, isLocked: !state.isLocked };

    case 'signal/left':
      return { ...state, signal: state.signal === 'left' ? 'off' : 'left' };

    case 'signal/right':
      return { ...state, signal: state.signal === 'right' ? 'off' : 'right' };

    case 'signal/hazards':
      return { ...state, hazards: !state.hazards };

    case 'temperature/step':
      return {
        ...state,
        temperature: Math.min(
          MAX_TEMPERATURE,
          Math.max(MIN_TEMPERATURE, state.temperature + action.delta),
        ),
      };

    case 'volume/set':
      return { ...state, volume: Math.min(100, Math.max(0, action.volume)) };

    case 'profile/select':
      return { ...state, activeProfileId: action.id };

    case 'notice/show':
      return notify(state, action.message);

    case 'notice/dismiss':
      return { ...state, notice: null };

    case 'notifications/clear':
      return { ...state, notice: null, notifications: [] };

    default: {
      // Unreachable for typed callers; still guards against untyped dispatches.
      const unknown: { type: string } = action;
      throw new Error(`Unknown car action: ${unknown.type}`);
    }
  }
}

export { isAppId };
