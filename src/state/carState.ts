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
// The limit shown beside the speedometer, which is also what Autopilot follows.
export const SPEED_LIMIT_MPH = 30;
export const MIN_CHARGE_LIMIT = 50;
export const MAX_CHARGE_LIMIT = 100;
export const MIN_CHARGE_AMPS = 5;
export const MAX_CHARGE_AMPS = 48;
export const MIN_FOLLOWING_DISTANCE = 1;
export const MAX_FOLLOWING_DISTANCE = 7;
export const MAX_SPEED_OFFSET = 15;
export const MAX_ADJUSTMENT = 10;
export const MAX_DASHCAM_CLIPS = 20;
const MAX_TRACK_SPEED = 120;

// mph per second.
const ACCELERATION_RATE = { chill: 6, standard: 10, sport: 14 } as const;
const TRACK_ACCELERATION_RATE = 16;
const BRAKING_RATE = 18;
const REGEN_RATE = { low: 1.5, standard: 3 } as const;
const TRACK_REGEN_RATE = 5;
const COAST_RATE = 1;
const AUTOPILOT_RATE = { chill: 3, average: 5, assertive: 8 } as const;
const CREEP_SPEED = 3;
// Below this speed Roll lets regen fade out instead of braking to a stop.
const ROLL_FADE_SPEED = 6;
// A full pack can't take regen, so the car has to use its brakes or slow less.
const REGEN_LIMITED_PERCENT = 95;
// About 250 Wh per mile on a 75 kWh pack.
const PERCENT_PER_MILE = 100 / FULL_RANGE_MILES;
const TRACK_ENERGY_FACTOR = 1.5;
// How much of the energy used over a stretch comes back while regen slows the car.
const REGEN_RECOVERY = { low: 0.2, standard: 0.5 } as const;
const PACK_KWH = 75;
const CHARGE_VOLTS = 240;
// A full-current session, sped up so a demo finishes in a minute or two. Times and stats on
// screen are worked out from the real charge power, so they read as they would in the car.
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

// Each choice is listed once, so the type and the check on saved data can't disagree.
export const HEADLIGHT_MODES = ['off', 'parking', 'on', 'auto'] as const;
export const CHILD_LOCK_MODES = ['off', 'left', 'right', 'both'] as const;
export const ACCELERATION_MODES = ['chill', 'standard', 'sport'] as const;
export const STEERING_MODES = ['comfort', 'standard', 'sport'] as const;
export const STOPPING_MODES = ['creep', 'roll', 'hold'] as const;
export const REGEN_MODES = ['low', 'standard'] as const;
export const DRIVING_PROFILES = ['chill', 'average', 'assertive'] as const;
export const DASHCAM_MODES = ['auto', 'manual', 'honk'] as const;
export const DOME_LIGHT_MODES = ['off', 'on', 'auto'] as const;
export const PET_MODES = ['off', 'dog', 'camp'] as const;
export const APPEARANCES = ['light', 'dark', 'auto'] as const;
export const DISTANCE_UNITS = ['mi', 'km'] as const;
export const TEMPERATURE_UNITS = ['F', 'C'] as const;
export const PRESSURE_UNITS = ['psi', 'bar', 'kpa'] as const;
export const ENERGY_DISPLAYS = ['percent', 'distance'] as const;
export const TIME_FORMATS = ['12h', '24h'] as const;
export const KEY_KINDS = ['phone', 'card', 'fob'] as const;

export type Headlights = (typeof HEADLIGHT_MODES)[number];
export type ChildLock = (typeof CHILD_LOCK_MODES)[number];
export type Acceleration = (typeof ACCELERATION_MODES)[number];
export type SteeringMode = (typeof STEERING_MODES)[number];
export type StoppingMode = (typeof STOPPING_MODES)[number];
export type RegenMode = (typeof REGEN_MODES)[number];
export type DrivingProfile = (typeof DRIVING_PROFILES)[number];
export type DashcamMode = (typeof DASHCAM_MODES)[number];
export type DomeLights = (typeof DOME_LIGHT_MODES)[number];
export type PetMode = (typeof PET_MODES)[number];
export type Appearance = (typeof APPEARANCES)[number];
export type KeyKind = (typeof KEY_KINDS)[number];

export interface CarKey {
  id: number;
  kind: KeyKind;
  name: string;
}

// A mirror or the steering column, in steps either side of centre.
export interface Adjustment {
  x: number;
  y: number;
}

export interface Preferences {
  distance: (typeof DISTANCE_UNITS)[number];
  temperature: (typeof TEMPERATURE_UNITS)[number];
  tirePressure: (typeof PRESSURE_UNITS)[number];
  energyDisplay: (typeof ENERGY_DISPLAYS)[number];
  timeFormat: (typeof TIME_FORMATS)[number];
}

export type Pedal = 'none' | 'accelerate' | 'brake';

// 'scheduled' waits for the start time and 'stopped' for the driver, both with the cable in.
export type ChargeState = 'unplugged' | 'charging' | 'scheduled' | 'stopped' | 'complete';

export type VehiclePower = 'parked' | 'driving' | 'charging';

export interface ChargeSession {
  percentAdded: number;
  // Time in the car, not time in the demo. See CHARGE_PERCENT_PER_SECOND.
  hours: number;
}

export type Autopilot = 'off' | 'cruise' | 'autosteer';

export type SentryState = 'off' | 'standby' | 'alarm';

export type DashcamState = 'off' | 'paused' | 'recording';

export type ClipSource = 'manual' | 'honk' | 'sentry';

export interface DashcamClip {
  id: number;
  source: ClipSource;
  // Milliseconds since the epoch.
  time: number;
}

// Takes over the whole display, so only one can be up at a time.
export type OverlayMode = 'car-wash' | 'screen-clean';

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
  dashcamMode: DashcamMode;
  driveAwayLock: boolean;
  unlockOnPark: boolean;
  walkAwayLock: boolean;
  lockSound: boolean;
  keys: CarKey[];
  acceleration: Acceleration;
  steeringMode: SteeringMode;
  stoppingMode: StoppingMode;
  regenBraking: RegenMode;
  brakeWhenRegenLimited: boolean;
  trackMode: boolean;
  slipStart: boolean;
  offRoadAssist: boolean;
  chargeLimit: number;
  chargeCurrent: number;
  scheduledCharging: boolean;
  // 24-hour HH:MM.
  scheduledChargeTime: string;
  trafficAwareCruise: boolean;
  autosteer: boolean;
  followingDistance: number;
  // mph above or below the limit.
  speedOffset: number;
  drivingProfile: DrivingProfile;
  headlightsAfterExit: boolean;
  domeLights: DomeLights;
  ambientLights: boolean;
  fogLights: boolean;
  autoHighBeam: boolean;
  adaptiveHeadlights: boolean;
  windowsVented: boolean;
  mirrorLeft: Adjustment;
  mirrorRight: Adjustment;
  steeringWheel: Adjustment;
  petMode: PetMode;
  preferences: Preferences;
}

export interface DisplaySettings {
  // 0-100, the value the user chose. Auto overrides it without overwriting it.
  brightness: number;
  autoBrightness: boolean;
  appearance: Appearance;
  // 0-100, how much blue is taken out of the screen.
  blueLightReduction: number;
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
  chargePortOpen: boolean;
  // The current session, or the last one once the cable is out.
  chargeSession: ChargeSession | null;
  autopilot: Autopilot;
  sentryAlarm: boolean;
  // Saved clips, newest first, for the dashcam viewer.
  dashcamClips: DashcamClip[];
  overlayMode: OverlayMode | null;
  // What Car Wash Mode turned off, to put back when it ends.
  carWashRestore: Pick<VehicleSettings, 'wipers' | 'sentry'> | null;
  gloveboxOpen: boolean;
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
  | { type: 'charge/toggle' }
  | { type: 'charge-port/toggle' }
  | { type: 'autopilot/engage'; mode: Exclude<Autopilot, 'off'> }
  | { type: 'autopilot/disengage' }
  | { type: 'sentry/alarm' }
  | { type: 'sentry/clear' }
  | { type: 'dashcam/save'; source: Exclude<ClipSource, 'sentry'> }
  | { type: 'mode/enter'; mode: OverlayMode }
  | { type: 'mode/exit' }
  | { type: 'glovebox/toggle' }
  | { type: 'lock/walk-away' }
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
  chargePortOpen: false,
  chargeSession: null,
  autopilot: 'off',
  sentryAlarm: false,
  dashcamClips: [],
  overlayMode: null,
  carWashRestore: null,
  gloveboxOpen: false,
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
    dashcamMode: 'auto',
    sentry: false,
    driveAwayLock: true,
    unlockOnPark: true,
    walkAwayLock: true,
    lockSound: true,
    keys: [
      { id: 1, kind: 'phone', name: 'Phone key' },
      { id: 2, kind: 'card', name: 'Key card' },
      { id: 3, kind: 'fob', name: 'Key fob' },
    ],
    acceleration: 'standard',
    steeringMode: 'standard',
    stoppingMode: 'hold',
    regenBraking: 'standard',
    brakeWhenRegenLimited: true,
    trackMode: false,
    slipStart: false,
    offRoadAssist: false,
    chargeLimit: 80,
    chargeCurrent: MAX_CHARGE_AMPS,
    scheduledCharging: false,
    scheduledChargeTime: '23:00',
    trafficAwareCruise: true,
    autosteer: true,
    followingDistance: 3,
    speedOffset: 0,
    drivingProfile: 'average',
    headlightsAfterExit: true,
    domeLights: 'auto',
    ambientLights: true,
    fogLights: false,
    autoHighBeam: false,
    adaptiveHeadlights: true,
    windowsVented: false,
    mirrorLeft: { x: 0, y: 0 },
    mirrorRight: { x: 0, y: 0 },
    steeringWheel: { x: 0, y: 0 },
    petMode: 'off',
    preferences: {
      distance: 'mi',
      temperature: 'F',
      tirePressure: 'psi',
      energyDisplay: 'percent',
      timeFormat: '12h',
    },
  },
  display: { brightness: 100, autoBrightness: false, appearance: 'light', blueLightReduction: 0 },
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

const inGear = (state: CarState): boolean => state.gear === 'D' || state.gear === 'R';

const creepTarget = (state: CarState): number =>
  inGear(state) && state.settings.stoppingMode === 'creep' && state.batteryPercent > 0
    ? CREEP_SPEED
    : 0;

// The loop only runs while something is actually changing.
export const isSimulationActive = (state: CarState): boolean =>
  state.speed > 0 ||
  state.pedal !== 'none' ||
  state.chargeState === 'charging' ||
  state.chargeState === 'scheduled' ||
  state.autopilot !== 'off' ||
  creepTarget(state) > 0;

// In gear and stationary with Hold selected: the car keeps itself still with no pedal down.
export const isHolding = (state: CarState): boolean =>
  inGear(state) &&
  state.speed === 0 &&
  state.pedal === 'none' &&
  state.autopilot === 'off' &&
  state.settings.stoppingMode === 'hold';

export const isRegenLimited = (state: CarState): boolean =>
  state.batteryPercent >= REGEN_LIMITED_PERCENT;

export const isChargeCableIn = (state: CarState): boolean => state.chargeState !== 'unplugged';

export const chargeKilowatts = (state: CarState): number =>
  (state.settings.chargeCurrent * CHARGE_VOLTS) / 1000;

const percentToKwh = (percent: number) => (percent / 100) * PACK_KWH;

export const sessionKwh = (session: ChargeSession): number => percentToKwh(session.percentAdded);

export const sessionMiles = (session: ChargeSession): number =>
  (session.percentAdded / 100) * FULL_RANGE_MILES;

// Hours left in the car's own time, or null when nothing is left to add.
export const chargeHoursRemaining = (state: CarState): number | null => {
  const percent = state.settings.chargeLimit - state.batteryPercent;
  if (!isChargeCableIn(state) || percent <= 0) return null;
  return percentToKwh(percent) / chargeKilowatts(state);
};

export const autopilotTargetSpeed = (state: CarState): number =>
  Math.max(0, Math.min(MAX_SPEED, SPEED_LIMIT_MPH + state.settings.speedOffset));

// Sentry is a setting that holds through a drive, but it only watches in Park.
export const sentryState = (state: CarState): SentryState => {
  if (!state.settings.sentry || !isParked(state)) return 'off';
  return state.sentryAlarm ? 'alarm' : 'standby';
};

export const dashcamState = (state: CarState): DashcamState => {
  if (!state.settings.dashcam) return 'off';
  if (state.settings.dashcamMode === 'manual') return 'recording';
  return !isParked(state) || sentryState(state) !== 'off' ? 'recording' : 'paused';
};

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

// The settings that have a rule of their own. Everything else can change at any time.
export function canChangeSettings(state: CarState, patch: Partial<VehicleSettings>): Permission {
  if (patch.sentry && !isParked(state)) {
    return { allowed: false, reason: 'Sentry Mode is only available in Park' };
  }
  if (patch.trackMode && !isParked(state)) {
    return { allowed: false, reason: 'Shift to Park to turn on Track Mode' };
  }
  if (patch.steeringWheel) return canAdjustSteering(state);
  if (patch.keys?.length === 0) {
    return { allowed: false, reason: 'The car needs at least one key' };
  }
  return ALLOWED;
}

export function canEnterMode(state: CarState, mode: OverlayMode): Permission {
  if (mode === 'car-wash') {
    if (!isParked(state)) return { allowed: false, reason: 'Shift to Park to use Car Wash Mode' };
    if (isChargeCableIn(state)) {
      return { allowed: false, reason: 'Unplug the charge cable to use Car Wash Mode' };
    }
  }
  if (mode === 'screen-clean' && !isParked(state)) {
    return { allowed: false, reason: 'Shift to Park to clean the screen' };
  }
  return ALLOWED;
}

export function canToggleChargePort(state: CarState): Permission {
  if (!isParked(state)) return { allowed: false, reason: 'Shift to Park to use the charge port' };
  if (isChargeCableIn(state)) return { allowed: false, reason: 'Unplug the charge cable first' };
  return ALLOWED;
}

export function canEngageAutopilot(state: CarState, mode: Exclude<Autopilot, 'off'>): Permission {
  if (!isDriving(state)) return { allowed: false, reason: 'Shift to Drive to engage' };
  if (state.settings.trackMode) {
    return { allowed: false, reason: 'Not available in Track Mode' };
  }
  if (!state.settings.trafficAwareCruise) {
    return { allowed: false, reason: 'Turn on Traffic-Aware Cruise Control first' };
  }
  if (mode === 'autosteer' && !state.settings.autosteer) {
    return { allowed: false, reason: 'Turn on Autosteer first' };
  }
  return ALLOWED;
}

export function canAdjustSteering(state: CarState): Permission {
  if (!isParked(state)) {
    return { allowed: false, reason: 'Shift to Park to adjust the steering wheel' };
  }
  return ALLOWED;
}

export function canWalkAwayLock(state: CarState): Permission {
  if (!state.settings.walkAwayLock) {
    return { allowed: false, reason: 'Turn on Walk-Away Door Lock first' };
  }
  if (!isParked(state)) return { allowed: false, reason: 'Shift to Park first' };
  if (state.isLocked) return { allowed: false, reason: 'The car is already locked' };
  return ALLOWED;
}

export function canSaveClip(state: CarState): Permission {
  if (dashcamState(state) === 'off') return { allowed: false, reason: 'Turn on the dashcam first' };
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

const saveClip = (state: CarState, source: ClipSource): CarState => ({
  ...state,
  dashcamClips: [
    { id: (state.dashcamClips[0]?.id ?? 0) + 1, source, time: Date.now() },
    ...state.dashcamClips,
  ].slice(0, MAX_DASHCAM_CLIPS),
});

// Car Wash Mode makes the car ready by itself, and puts back what the driver had on.
function enterCarWash(state: CarState): CarState {
  const { wipers, sentry } = state.settings;
  return {
    ...state,
    overlayMode: 'car-wash',
    carWashRestore: { wipers, sentry },
    chargePortOpen: false,
    sentryAlarm: false,
    settings: { ...state.settings, wipers: { mode: 'off' }, sentry: false, windowsVented: false },
  };
}

const exitMode = (state: CarState): CarState => ({
  ...state,
  overlayMode: null,
  carWashRestore: null,
  settings: { ...state.settings, ...state.carWashRestore },
});

const MODE_LABELS: Record<OverlayMode, string> = {
  'car-wash': 'Car Wash Mode',
  'screen-clean': 'Screen Clean Mode',
};

// Free Roll is Neutral inside Car Wash Mode. Any other gear ends a mode that needs Park.
const survivesGear = (mode: OverlayMode, gear: Gear) =>
  gear === 'P' || (mode === 'car-wash' && gear === 'N');

function shift(state: CarState, gear: Gear): CarState {
  let next: CarState = {
    ...state,
    gear,
    // Closures can only be open in Park.
    openCompartment: gear === 'P' ? state.openCompartment : null,
    autopilot: gear === 'D' ? state.autopilot : 'off',
    sentryAlarm: gear === 'P' && state.sentryAlarm,
  };

  if (state.overlayMode && !survivesGear(state.overlayMode, gear)) {
    next = notify(exitMode(next), `${MODE_LABELS[state.overlayMode]} ended`);
  }

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

// How hard the car slows with no pedal down, which is most of what Dynamics changes.
function liftOffRate(state: CarState): number {
  const { regenBraking, stoppingMode, trackMode, brakeWhenRegenLimited } = state.settings;
  // Regen slows the car in gear; in Neutral it only coasts.
  if (!inGear(state)) return COAST_RATE;
  if (stoppingMode === 'roll' && state.speed < ROLL_FADE_SPEED) return COAST_RATE;
  if (isRegenLimited(state) && !brakeWhenRegenLimited) return COAST_RATE;
  return trackMode ? TRACK_REGEN_RATE : REGEN_RATE[regenBraking];
}

function nextSpeed(state: CarState, seconds: number): number {
  const { acceleration, trackMode, drivingProfile } = state.settings;
  const forwardSpeed = trackMode ? MAX_TRACK_SPEED : MAX_SPEED;
  const topSpeed = state.gear === 'R' ? MAX_REVERSE_SPEED : forwardSpeed;
  const hasCharge = state.batteryPercent > 0;

  if (state.pedal === 'brake') return approach(state.speed, 0, BRAKING_RATE * seconds);
  if (state.pedal === 'accelerate' && inGear(state) && hasCharge) {
    const rate = trackMode ? TRACK_ACCELERATION_RATE : ACCELERATION_RATE[acceleration];
    return approach(state.speed, topSpeed, rate * seconds);
  }
  if (state.autopilot !== 'off' && hasCharge) {
    const rate = AUTOPILOT_RATE[drivingProfile];
    return approach(state.speed, autopilotTargetSpeed(state), rate * seconds);
  }
  return approach(state.speed, creepTarget(state), liftOffRate(state) * seconds);
}

// Positive uses energy, negative recovers it.
function energyPercent(state: CarState, speed: number, miles: number): number {
  const percent = miles * PERCENT_PER_MILE;
  const isRegenerating =
    inGear(state) && state.pedal === 'none' && speed < state.speed && !isRegenLimited(state);
  if (isRegenerating) return -percent * REGEN_RECOVERY[state.settings.regenBraking];
  return state.settings.trackMode ? percent * TRACK_ENERGY_FACTOR : percent;
}

const isScheduleDue = (time: string, now: Date) =>
  time ===
  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

function chargeTick(state: CarState, seconds: number): CarState {
  const { chargeLimit, chargeCurrent } = state.settings;
  // Lowering the limit under the battery ends the session. It never takes charge away.
  if (state.batteryPercent >= chargeLimit) {
    return notify({ ...state, chargeState: 'complete' }, 'Charging complete');
  }
  const rate = (CHARGE_PERCENT_PER_SECOND * chargeCurrent) / MAX_CHARGE_AMPS;
  const batteryPercent = Math.min(chargeLimit, state.batteryPercent + rate * seconds);
  const added = batteryPercent - state.batteryPercent;
  const session = state.chargeSession ?? { percentAdded: 0, hours: 0 };
  const chargeSession = {
    percentAdded: session.percentAdded + added,
    hours: session.hours + percentToKwh(added) / chargeKilowatts(state),
  };
  if (batteryPercent < chargeLimit) return { ...state, batteryPercent, chargeSession };
  return notify(
    { ...state, batteryPercent, chargeSession, chargeState: 'complete' },
    'Charging complete',
  );
}

function tick(state: CarState, seconds: number): CarState {
  if (state.chargeState === 'charging') return chargeTick(state, seconds);
  if (state.chargeState === 'scheduled') {
    return isScheduleDue(state.settings.scheduledChargeTime, new Date())
      ? { ...state, chargeState: 'charging' }
      : state;
  }

  const speed = nextSpeed(state, seconds);
  const miles = ((state.speed + speed) / 2) * (seconds / 3600);
  const batteryPercent = Math.min(
    100,
    Math.max(0, state.batteryPercent - energyPercent(state, speed, miles)),
  );
  return {
    ...state,
    speed,
    batteryPercent,
    odometerMiles: state.odometerMiles + miles,
    tripMiles: state.tripMiles + miles,
  };
}

const chargeStateOnPlug = (state: CarState): ChargeState => {
  if (state.batteryPercent >= state.settings.chargeLimit) return 'complete';
  return state.settings.scheduledCharging ? 'scheduled' : 'charging';
};

// Settings that other state has to follow, so no caller has to remember to.
function applySettings(state: CarState, patch: Partial<VehicleSettings>): CarState {
  const settings = { ...state.settings, ...patch };
  const next = { ...state, settings, sentryAlarm: settings.sentry && state.sentryAlarm };
  const canResume = state.chargeState === 'complete' && state.batteryPercent < settings.chargeLimit;

  return {
    ...next,
    chargeState: canResume ? 'charging' : next.chargeState,
    autopilot: allowedAutopilot(next),
  };
}

// What is left of an engaged Autopilot once a setting has changed under it.
function allowedAutopilot(state: CarState): Autopilot {
  if (state.autopilot === 'off') return 'off';
  if (canEngageAutopilot(state, state.autopilot).allowed) return state.autopilot;
  return canEngageAutopilot(state, 'cruise').allowed ? 'cruise' : 'off';
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

    case 'pedal/set': {
      if (state.pedal === action.pedal) return state;
      const next = { ...state, pedal: action.pedal };
      // The brake always takes the car back from Autopilot.
      return action.pedal === 'brake' && state.autopilot !== 'off'
        ? notify({ ...next, autopilot: 'off' }, 'Autopilot disengaged')
        : next;
    }

    case 'sim/tick':
      return tick(state, action.seconds);

    case 'charge/plug':
      if (!isParked(state)) return notify(state, 'Shift to Park to charge');
      if (isChargeCableIn(state)) return state;
      return {
        ...state,
        chargePortOpen: true,
        chargeSession: { percentAdded: 0, hours: 0 },
        chargeState: chargeStateOnPlug(state),
      };

    // Unlatching lets the cable out, and the port closes behind it.
    case 'charge/unplug':
      return { ...state, chargeState: 'unplugged', chargePortOpen: false };

    case 'charge/toggle':
      if (state.chargeState === 'charging') return { ...state, chargeState: 'stopped' };
      if (state.chargeState === 'stopped' || state.chargeState === 'scheduled') {
        return { ...state, chargeState: 'charging' };
      }
      return state;

    case 'charge-port/toggle': {
      const permission = canToggleChargePort(state);
      return permission.allowed
        ? { ...state, chargePortOpen: !state.chargePortOpen }
        : notify(state, permission.reason);
    }

    case 'autopilot/engage': {
      const permission = canEngageAutopilot(state, action.mode);
      return permission.allowed
        ? { ...state, autopilot: action.mode }
        : notify(state, permission.reason);
    }

    case 'autopilot/disengage':
      return { ...state, autopilot: 'off' };

    case 'sentry/alarm': {
      if (sentryState(state) !== 'standby') return state;
      const alarmed = { ...state, sentryAlarm: true };
      const saved = dashcamState(state) === 'off' ? alarmed : saveClip(alarmed, 'sentry');
      // The alarm has its own banner, so this only goes in the history.
      return { ...notify(saved, 'Sentry Mode alarm'), notice: null };
    }

    case 'sentry/clear':
      return { ...state, sentryAlarm: false };

    case 'dashcam/save': {
      const permission = canSaveClip(state);
      return permission.allowed
        ? notify(saveClip(state, action.source), 'Dashcam clip saved')
        : notify(state, permission.reason);
    }

    case 'mode/enter': {
      if (state.overlayMode) return state;
      const permission = canEnterMode(state, action.mode);
      if (!permission.allowed) return notify(state, permission.reason);
      return action.mode === 'car-wash'
        ? enterCarWash(state)
        : { ...state, overlayMode: action.mode };
    }

    case 'mode/exit': {
      if (!state.overlayMode) return state;
      // Leaving Free Roll puts the car back in Park, where the mode started.
      return exitMode(state.gear === 'N' ? shift(state, 'P') : state);
    }

    case 'glovebox/toggle':
      return { ...state, gloveboxOpen: !state.gloveboxOpen };

    case 'lock/walk-away': {
      const permission = canWalkAwayLock(state);
      return notify(
        permission.allowed ? { ...state, isLocked: true } : state,
        permission.allowed ? 'Locked as you walked away' : permission.reason,
      );
    }

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

    case 'settings/set': {
      const permission = canChangeSettings(state, action.patch);
      return permission.allowed
        ? applySettings(state, action.patch)
        : notify(state, permission.reason);
    }

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

    // Coming back to the car and unlocking it stands Sentry down.
    case 'lock/toggle':
      return {
        ...state,
        isLocked: !state.isLocked,
        sentryAlarm: state.isLocked ? false : state.sentryAlarm,
      };

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
