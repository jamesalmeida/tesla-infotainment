import { DOCK, isAppId, isParkedOnly, pausesOutOfPark, APPS, type AppId } from '../apps/registry';
import {
  CLIMATE_MODE_LABELS,
  cycleSeat,
  endMode,
  initialClimate,
  setCabin,
  setOptions,
  startMode,
  stepTemperature,
  toggleDefrost,
  toggleHeatAuto,
  type CabinSettings,
  type ClimateMode,
  type ClimateOptions,
  type ClimateState,
  type DefrostWindow,
  type SeatId,
  type SeatKind,
  type TemperatureZone,
} from './climate';

import {
  DEFAULT_PROFILES,
  findProfile,
  isDriverProfile,
  MAX_PROFILES,
  PROFILE_SETTING_KEYS,
  profileImage,
  VALET_PROFILE_ID,
  type CabinPosition,
  type Profile,
  type ProfileSettings,
  type ProfileSnapshot,
} from './profiles';
import { DEMO_UPDATES, findBluetoothDevice, findWifiNetwork, type WheelConfig } from './sampleData';

export type { AppId };
export type { CabinPosition, Profile };
export type {
  Airflow,
  CabinSettings,
  ClimateMode,
  ClimateOptions,
  ClimateState,
  DefrostWindow,
  OverheatProtection,
  SeatHeat,
  SeatId,
  SeatKind,
  SeatLevel,
  TemperatureZone,
  WheelHeat,
} from './climate';
export { MAX_TEMPERATURE, MIN_TEMPERATURE } from './climate';

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

// More than this at once would cover the car.
export const MAX_TOASTS = 3;
export const MAX_TRIP_METERS = 6;
export const MAX_NAME_LENGTH = 24;
export const MIN_SPEED_LIMIT = 50;
// How long the simulated radios take, in seconds.
const WIFI_CONNECT_SECONDS = 2;
const BLUETOOTH_LINK_SECONDS = 2;
const GARAGE_DOOR_SECONDS = 4;
const RESTART_SECONDS = 3;
const UPDATE_PHASE_SECONDS = { checking: 2, downloading: 6, installing: 5 } as const;
// HomeLink stops working once the car is this far from where the driver set home.
export const HOMELINK_RANGE_MILES = 0.25;
export const VALET_MAX_SPEED = 70;

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

export const TIRE_CORNERS = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'] as const;
export type TireCorner = (typeof TIRE_CORNERS)[number];
export type TirePressures = Record<TireCorner, number>;
export const LOW_TIRE_PSI = 36;
export const TIRE_CORNER_LABELS: Record<TireCorner, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  rearLeft: 'Rear Left',
  rearRight: 'Rear Right',
};

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
  'Notifications',
  'Audio',
  'Profiles',
  'Bluetooth',
  'Schedule',
  'Upgrades',
  'HomeLink',
] as const;

export type SettingsPanel = (typeof SETTINGS_PANELS)[number];

// What is showing over the map. One value, so "open with no app" can't exist.
export type Surface =
  | { kind: 'closed' }
  | { kind: 'app'; app: Exclude<AppId, 'camera' | 'car-settings'> }
  | { kind: 'settings'; panel: SettingsPanel }
  | { kind: 'camera' };

export type ModalId = 'app-shelf' | 'climate' | 'shortcuts' | 'drive-pin';

export type DockItem = (typeof DOCK)[number];

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

export type MapUnits = 'mi' | 'km';

export interface SuperchargerFilters {
  // 0 shows every site.
  minPowerKw: 0 | 150 | 250;
  food: boolean;
  restrooms: boolean;
  shopping: boolean;
}

export type ImmersiveSound = 'off' | 'standard' | 'high';

export type AssistantStyle = 'friendly' | 'concise' | 'playful';

export type CollisionWarning = 'off' | 'late' | 'average' | 'early';

// Where a meter started counting. Odometer and energy only rise, so a meter is a subtraction.
export interface MeterBaseline {
  miles: number;
  kwh: number;
}

export interface TripMeter extends MeterBaseline {
  id: number;
  name: string;
}

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
  mapUnits: MapUnits;
  // The route request reads these.
  onlineRouting: boolean;
  avoidTolls: boolean;
  avoidFerries: boolean;
  tripPlanner: boolean;
  // Percent of battery left on arrival at the destination.
  arrivalChargeTarget: number;
  superchargerFilters: SuperchargerFilters;
  // 0-100, separate from the media volume in CarState.volume.
  navVolume: number;
  // -6 to +6 dB.
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  // -10 (left, rear) to +10 (right, front).
  audioBalance: number;
  audioFade: number;
  immersiveSound: ImmersiveSound;
  assistantEnabled: boolean;
  assistantStyle: AssistantStyle;
  joeMode: boolean;
  blindSpotWarning: boolean;
  collisionWarning: CollisionWarning;
  emergencyBraking: boolean;
  // While on, the warnings above can't be turned off.
  requireSafetyFeatures: boolean;
  speedLimitMph: number;
  // Both modes hold their PIN, and are only switched with the actions that check it.
  speedLimitMode: boolean;
  speedLimitPin: string;
  pinToDrive: boolean;
  drivePin: string;
  easyEntry: boolean;
  vehicleName: string;
  updatePreference: UpdatePreference;
  wheelConfig: WheelConfig;
  towMode: boolean;
  serviceVisitBooked: boolean;
}

export interface WifiState {
  enabled: boolean;
  hotspot: boolean;
  connectedId: string | null;
  // Most recent first. These connect again without asking for the password.
  savedIds: string[];
  attempt: { networkId: string; password: string; secondsLeft: number } | null;
  error: { networkId: string; message: string } | null;
}

export type WifiIndicator = 'off' | 'disconnected' | 'connecting' | 'connected';

export type BluetoothPairing =
  | { deviceId: string; phase: 'confirm' }
  | { deviceId: string; phase: 'linking'; secondsLeft: number };

export interface BluetoothState {
  enabled: boolean;
  pairedIds: string[];
  connectedId: string | null;
  // Connects first whenever Bluetooth comes on.
  priorityId: string | null;
  pairing: BluetoothPairing | null;
  error: { deviceId: string; message: string } | null;
}

export type GarageDoor = 'closed' | 'opening' | 'open' | 'closing';

export interface HomeLinkState {
  door: GarageDoor;
  // 0 is shut, 1 is fully open.
  doorPosition: number;
  // Where home is, as an odometer reading, since the simulator has no position to compare.
  homeOdometerMiles: number;
}

export type UpdatePreference = keyof typeof DEMO_UPDATES;

export type SoftwareUpdate =
  | { phase: 'idle' }
  | { phase: 'checking'; progress: number }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; version: string; progress: number }
  | { phase: 'ready'; version: string }
  | { phase: 'installing'; version: string; progress: number };

export type ScheduleKind = 'charge' | 'departure';

export interface ScheduleEntry {
  id: number;
  kind: ScheduleKind;
  // 24-hour HH:MM.
  time: string;
  // 0 is Sunday. Empty means once, at the next occurrence of the time.
  days: number[];
  enabled: boolean;
  // The local date it last ran, so a recurring entry can't run twice in its minute.
  lastRanOn: string | null;
}

// Valet Mode is on while this exists. The driver it replaced comes back when it ends.
export interface ValetSession {
  pin: string;
  returnProfileId: number;
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
  // Everything the car has used, the counter trip meters read their energy from.
  energyUsedKwh: number;
  // Where the current trip's energy started; its distance is tripMiles.
  tripStartKwh: number;
  sinceChargeBaseline: MeterBaseline;
  tripMeters: TripMeter[];
  chargeState: ChargeState;
  chargePortOpen: boolean;
  // Cold pressures for each corner, in psi. Simulated readings.
  tirePressures: TirePressures;
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
  // PIN to Drive asks once per visit, and again after the car is locked.
  driveUnlocked: boolean;
  // Only one can be open at a time.
  openCompartment: Compartment | null;
  isLocked: boolean;
  signal: TurnSignal;
  // Hazards sit on top of the signal instead of replacing it.
  hazards: boolean;
  climate: ClimateState;
  volume: number;
  activeProfileId: number;
  // Only the profiles that have changed their dock; the rest use the default.
  dockByProfile: Record<number, DockItem[]>;
  profiles: Profile[];
  valet: ValetSession | null;
  // Where the driver set the seat, mirrors and wheel. Easy Entry moves away from this, and back.
  cabin: CabinPosition;
  easyEntryActive: boolean;
  wifi: WifiState;
  bluetooth: BluetoothState;
  homelink: HomeLinkState;
  softwareUpdate: SoftwareUpdate;
  // The last simulated update, shown beside the real version of this build.
  installedUpdate: string | null;
  // Above zero while the touchscreen is rebooting.
  restartSecondsLeft: number;
  schedule: ScheduleEntry[];
  // Plugged in, but waiting for a scheduled charge to start.
  chargeHeld: boolean;
  settings: VehicleSettings;
  display: DisplaySettings;
  // The newest message, on screen for a moment.
  notice: Notice | null;
  // Every message on screen right now, newest first.
  toasts: Notice[];
  // Everything shown recently, newest first, for the bell in Settings.
  notifications: Notice[];
  // The newest id the driver has seen in the panel, for the dot on the bell.
  notificationsSeenId: number;
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
  | { type: 'trip/add'; name: string }
  | { type: 'trip/rename'; id: number; name: string }
  | { type: 'trip/resetMeter'; id: number }
  | { type: 'trip/remove'; id: number }
  | { type: 'trip/move'; id: number; offset: -1 | 1 }
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
  | { type: 'climate/temperature'; zone: TemperatureZone; delta: number }
  | { type: 'climate/cabin'; patch: Partial<CabinSettings> }
  | { type: 'climate/options'; options: ClimateOptions }
  | { type: 'climate/defrost'; window: DefrostWindow }
  | { type: 'climate/seat'; seat: SeatId; kind: SeatKind }
  | { type: 'climate/heat-auto' }
  | { type: 'climate/mode'; mode: ClimateMode }
  | { type: 'volume/set'; volume: number }
  | { type: 'profile/select'; id: number }
  | { type: 'dock/move'; item: DockItem; delta: -1 | 1 }
  | { type: 'profile/add'; name: string }
  | { type: 'profile/rename'; id: number; name: string }
  | { type: 'profile/delete'; id: number }
  | { type: 'cabin/set'; patch: Partial<CabinPosition> }
  | { type: 'valet/enter'; pin: string }
  | { type: 'valet/exit'; pin: string }
  | { type: 'notice/show'; message: string }
  // Without an id, clears every toast.
  | { type: 'notice/dismiss'; id?: number }
  | { type: 'notifications/clear' }
  | { type: 'notifications/seen' }
  | { type: 'speedLimit/enable'; pin: string }
  | { type: 'speedLimit/disable'; pin: string }
  | { type: 'pinToDrive/enable'; pin: string }
  | { type: 'pinToDrive/disable'; pin: string }
  | { type: 'pinToDrive/unlock'; pin: string }
  | { type: 'pins/reset' }
  | { type: 'tow/set'; enabled: boolean }
  | { type: 'system/restart' }
  | { type: 'software/check' }
  | { type: 'software/download' }
  | { type: 'software/install' }
  | { type: 'homelink/toggle' }
  | { type: 'homelink/setHome' }
  | { type: 'schedule/add'; kind: ScheduleKind; time: string; days: number[] }
  | { type: 'schedule/remove'; id: number }
  | { type: 'schedule/enable'; id: number; enabled: boolean }
  | { type: 'schedule/run'; id: number; date: string }
  | { type: 'charge/startNow' }
  | { type: 'wifi/enable'; enabled: boolean }
  | { type: 'wifi/connect'; id: string; password: string }
  | { type: 'wifi/disconnect' }
  | { type: 'wifi/forget'; id: string }
  | { type: 'wifi/hotspot'; enabled: boolean }
  | { type: 'bluetooth/enable'; enabled: boolean }
  | { type: 'bluetooth/pair'; id: string }
  | { type: 'bluetooth/confirm' }
  | { type: 'bluetooth/cancel' }
  | { type: 'bluetooth/connect'; id: string }
  | { type: 'bluetooth/disconnect' }
  | { type: 'bluetooth/forget'; id: string }
  | { type: 'bluetooth/priority'; id: string | null }
  | { type: 'safety/require'; enabled: boolean };

export const initialCarState: CarState = {
  gear: 'P',
  speed: 0,
  pedal: 'none',
  batteryPercent: 69,
  odometerMiles: 12480,
  tripMiles: 0,
  energyUsedKwh: 3020,
  tripStartKwh: 3020,
  sinceChargeBaseline: { miles: 12460, kwh: 3015.16 },
  tripMeters: [
    { id: 1, name: 'Trip A', miles: 12100, kwh: 2928 },
    { id: 2, name: 'Trip B', miles: 12480, kwh: 3020 },
  ],
  chargeState: 'unplugged',
  chargePortOpen: false,
  tirePressures: { frontLeft: 42, frontRight: 41, rearLeft: 42, rearRight: 34 },
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
  driveUnlocked: false,
  openCompartment: null,
  isLocked: true,
  signal: 'off',
  hazards: false,
  climate: initialClimate,
  volume: 50,
  activeProfileId: 1,
  dockByProfile: {},
  profiles: DEFAULT_PROFILES,
  valet: null,
  cabin: {
    seatPosition: 50,
    seatHeight: 50,
    seatRecline: 50,
    mirrorTilt: 50,
    mirrorPan: 50,
    steeringTilt: 50,
    steeringReach: 50,
  },
  easyEntryActive: false,
  wifi: {
    enabled: true,
    hotspot: false,
    connectedId: null,
    savedIds: [],
    attempt: null,
    error: null,
  },
  bluetooth: {
    enabled: true,
    pairedIds: [],
    connectedId: null,
    priorityId: null,
    pairing: null,
    error: null,
  },
  homelink: { door: 'closed', doorPosition: 0, homeOdometerMiles: 12480 },
  softwareUpdate: { phase: 'idle' },
  installedUpdate: null,
  restartSecondsLeft: 0,
  schedule: [],
  chargeHeld: false,
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
    mapUnits: 'mi',
    onlineRouting: true,
    avoidTolls: false,
    avoidFerries: false,
    tripPlanner: true,
    arrivalChargeTarget: 10,
    superchargerFilters: { minPowerKw: 0, food: false, restrooms: false, shopping: false },
    navVolume: 50,
    eqBass: 0,
    eqMid: 0,
    eqTreble: 0,
    audioBalance: 0,
    audioFade: 0,
    immersiveSound: 'standard',
    assistantEnabled: false,
    assistantStyle: 'friendly',
    joeMode: false,
    blindSpotWarning: true,
    collisionWarning: 'average',
    emergencyBraking: true,
    requireSafetyFeatures: false,
    speedLimitMph: 65,
    speedLimitMode: false,
    speedLimitPin: '',
    pinToDrive: false,
    drivePin: '',
    easyEntry: false,
    vehicleName: 'Demo Car',
    updatePreference: 'standard',
    wheelConfig: 'sport-19',
    towMode: false,
    serviceVisitBooked: false,
  },
  display: { brightness: 100, autoBrightness: false, appearance: 'light', blueLightReduction: 0 },
  notice: null,
  toasts: [],
  notifications: [],
  notificationsSeenId: 0,
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

export const dockOrder = (state: CarState): DockItem[] =>
  state.dockByProfile[state.activeProfileId] ?? DOCK;

export const hasUnreadNotifications = (state: CarState): boolean =>
  (state.notifications[0]?.id ?? 0) > state.notificationsSeenId;

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

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin);

export const needsDrivePin = (state: CarState): boolean =>
  state.settings.pinToDrive && !state.driveUnlocked;

export const isValet = (state: CarState): boolean => state.valet !== null;

// The fastest the car will go in Drive right now.
export const speedCap = (state: CarState): number =>
  Math.min(
    MAX_SPEED,
    isValet(state) ? VALET_MAX_SPEED : MAX_SPEED,
    state.settings.speedLimitMode ? state.settings.speedLimitMph : MAX_SPEED,
  );

// Easy Entry slides the seat back and lifts the wheel, without touching the saved position.
export const effectiveCabin = (state: CarState): CabinPosition =>
  state.easyEntryActive
    ? { ...state.cabin, seatPosition: 100, steeringTilt: 100, steeringReach: 0 }
    : state.cabin;

// What the map icon and the status bar show.
export function wifiIndicator({ wifi }: CarState): WifiIndicator {
  if (!wifi.enabled) return 'off';
  if (wifi.attempt) return 'connecting';
  return wifi.connectedId ? 'connected' : 'disconnected';
}

export const connectedWifiName = ({ wifi }: CarState): string | null =>
  wifi.connectedId ? (findWifiNetwork(wifi.connectedId)?.ssid ?? null) : null;

export const connectedBluetoothName = ({ bluetooth }: CarState): string | null =>
  bluetooth.connectedId ? (findBluetoothDevice(bluetooth.connectedId)?.name ?? null) : null;

// The device the player's source icon stands for, if one can play audio.
export function bluetoothMediaSource({ bluetooth }: CarState): string | null {
  const device = bluetooth.connectedId ? findBluetoothDevice(bluetooth.connectedId) : undefined;
  return device?.hasMedia ? device.name : null;
}

// A corner is low when its cold pressure is under the warning threshold.
export const lowTireCorners = (state: CarState): TireCorner[] =>
  TIRE_CORNERS.filter((corner) => state.tirePressures[corner] < LOW_TIRE_PSI);

export const hasTirePressureWarning = (state: CarState): boolean =>
  lowTireCorners(state).length > 0;

export const isHomeLinkInRange = (state: CarState): boolean =>
  Math.abs(state.odometerMiles - state.homelink.homeOdometerMiles) <= HOMELINK_RANGE_MILES;

export const isRestarting = (state: CarState): boolean => state.restartSecondsLeft > 0;

// The update on offer for the driver's preference, once they aren't already on it.
const offeredUpdate = (state: CarState): string | null => {
  const version = DEMO_UPDATES[state.settings.updatePreference];
  return version === state.installedUpdate ? null : version;
};

const isUpdateRunning = ({ softwareUpdate: { phase } }: CarState): boolean =>
  phase === 'checking' || phase === 'downloading' || phase === 'installing';

const isDoorMoving = ({ homelink: { door } }: CarState): boolean =>
  door === 'opening' || door === 'closing';

// Timed systems that need the loop even with the car standing still.
const hasRunningSystem = (state: CarState): boolean =>
  state.wifi.attempt !== null ||
  state.bluetooth.pairing?.phase === 'linking' ||
  isUpdateRunning(state) ||
  isDoorMoving(state) ||
  isRestarting(state);

// The loop only runs while something is actually changing.
export const isSimulationActive = (state: CarState): boolean =>
  state.speed > 0 ||
  state.pedal !== 'none' ||
  (state.chargeState === 'charging' && !state.chargeHeld) ||
  state.chargeState === 'scheduled' ||
  state.autopilot !== 'off' ||
  creepTarget(state) > 0 ||
  hasRunningSystem(state);

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
const DRIVE_PIN_REASON = 'Enter your PIN to drive';

const parkedFor = (state: CarState, what: string): Permission =>
  isParked(state) ? ALLOWED : { allowed: false, reason: `Shift to Park to ${what}` };

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
  if (gear !== 'P' && state.softwareUpdate.phase === 'installing') {
    return { allowed: false, reason: 'Wait for the update to finish' };
  }
  if ((gear === 'D' || gear === 'R') && state.settings.towMode) {
    return { allowed: false, reason: 'Turn off Tow Mode to drive' };
  }
  if (gear !== 'P' && needsDrivePin(state)) return { allowed: false, reason: DRIVE_PIN_REASON };
  return ALLOWED;
}

export const canSetTowMode = (state: CarState): Permission => parkedFor(state, 'change Tow Mode');

export const canRestartDisplay = (state: CarState): Permission =>
  parkedFor(state, 'restart the touchscreen');

export const canInstallUpdate = (state: CarState): Permission =>
  parkedFor(state, 'install the update');

export function canUseHomeLink(state: CarState): Permission {
  if (isValet(state)) return { allowed: false, reason: 'Not available in Valet Mode' };
  if (!isHomeLinkInRange(state))
    return { allowed: false, reason: 'Too far from home for HomeLink' };
  return ALLOWED;
}

const VALET_PROFILES_REASON = 'Exit Valet Mode to change drivers';

export const canEditProfiles = (state: CarState): Permission =>
  isValet(state) ? { allowed: false, reason: VALET_PROFILES_REASON } : ALLOWED;

export function canSelectProfile(state: CarState, id: number): Permission {
  if (isValet(state)) return { allowed: false, reason: VALET_PROFILES_REASON };
  if (id === VALET_PROFILE_ID) return { allowed: false, reason: 'Enter a PIN to use Valet Mode' };
  return parkedFor(state, 'change drivers');
}

export function canEnterValet(state: CarState): Permission {
  if (isValet(state)) return { allowed: false, reason: 'Valet Mode is already on' };
  return parkedFor(state, 'use Valet Mode');
}

export const canExitValet = (state: CarState): Permission => parkedFor(state, 'exit Valet Mode');

const VALET_RADIOS_REASON = 'Not available in Valet Mode';

export function canConnectWifi(state: CarState): Permission {
  if (isValet(state)) return { allowed: false, reason: VALET_RADIOS_REASON };
  if (!state.wifi.enabled) return { allowed: false, reason: 'Turn on Wifi first' };
  return ALLOWED;
}

export function canPairBluetooth(state: CarState): Permission {
  if (isValet(state)) return { allowed: false, reason: VALET_RADIOS_REASON };
  if (!state.bluetooth.enabled) return { allowed: false, reason: 'Turn on Bluetooth first' };
  return ALLOWED;
}

export const canSetSpeedLimit = (state: CarState): Permission =>
  parkedFor(state, 'change Speed Limit Mode');

export const canSetPinToDrive = (state: CarState): Permission =>
  parkedFor(state, 'change PIN to Drive');

export const canRequireSafetyFeatures = (state: CarState): Permission =>
  parkedFor(state, 'change this setting');

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

// Keep Climate, Dog and Camp hold the cabin for someone left in a stationary car.
export function canStartClimateMode(state: CarState): Permission {
  if (!isParked(state)) {
    return { allowed: false, reason: 'Shift to Park to keep the climate running' };
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
    // Pressing the same refused control again shouldn't stack copies of one message.
    toasts: [notice, ...state.toasts.filter((toast) => toast.message !== message)].slice(
      0,
      MAX_TOASTS,
    ),
    notifications: [notice, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
  };
};

const announceModeEnd = (state: CarState, mode: ClimateMode, reason: string): CarState =>
  notify(state, `${CLIMATE_MODE_LABELS[mode]} is off: ${reason}`);

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
    easyEntryActive: gear === 'P' && state.settings.easyEntry,
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

  // Climate modes only hold a parked cabin, so leaving Park ends them.
  const { mode } = state.climate;
  if (mode && gear !== 'P') {
    next = announceModeEnd({ ...next, climate: endMode(next.climate) }, mode, 'the car left Park');
  }

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

const pickProfileSettings = (settings: VehicleSettings): ProfileSettings =>
  Object.fromEntries(
    PROFILE_SETTING_KEYS.map((key) => [key, settings[key]]),
  ) as unknown as ProfileSettings;

const snapshot = ({ cabin, climate, volume, display, settings }: CarState): ProfileSnapshot => ({
  cabin,
  temperature: climate.driverTemp,
  volume,
  display,
  settings: pickProfileSettings(settings),
});

const saveActiveProfile = (state: CarState): CarState => ({
  ...state,
  profiles: state.profiles.map((profile) =>
    profile.id === state.activeProfileId ? { ...profile, saved: snapshot(state) } : profile,
  ),
});

// Makes a driver current. A driver with nothing saved takes the car as they find it.
function loadProfile(state: CarState, id: number): CarState {
  const profile = findProfile(state.profiles, id);
  const { saved } = profile;
  const next = { ...state, activeProfileId: profile.id, easyEntryActive: false };
  if (!saved) return next;
  return {
    ...next,
    cabin: saved.cabin,
    climate: {
      ...state.climate,
      driverTemp: saved.temperature,
      passengerTemp: state.climate.isSplit ? state.climate.passengerTemp : saved.temperature,
    },
    volume: saved.volume,
    display: saved.display,
    settings: { ...state.settings, ...saved.settings },
  };
}

const safetyFeaturesOn = (settings: VehicleSettings): VehicleSettings => ({
  ...settings,
  blindSpotWarning: true,
  emergencyBraking: true,
  collisionWarning: settings.collisionWarning === 'off' ? 'average' : settings.collisionWarning,
});

// Turning a PIN mode on or off, once its permission and PIN are checked.
function withPin(
  state: CarState,
  permission: Permission,
  pin: string,
  expected: string,
  apply: (settings: VehicleSettings) => Partial<VehicleSettings>,
): CarState {
  if (!permission.allowed) return notify(state, permission.reason);
  if (pin !== expected) return notify(state, 'Incorrect PIN');
  return { ...state, settings: { ...state.settings, ...apply(state.settings) } };
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
  const forwardSpeed = trackMode ? MAX_TRACK_SPEED : speedCap(state);
  const topSpeed = state.gear === 'R' ? MAX_REVERSE_SPEED : forwardSpeed;
  const hasCharge = state.batteryPercent > 0;

  if (state.pedal === 'brake') return approach(state.speed, 0, BRAKING_RATE * seconds);
  if (state.pedal === 'accelerate' && inGear(state) && hasCharge) {
    const mode = isValet(state) ? 'chill' : acceleration;
    const rate = trackMode ? TRACK_ACCELERATION_RATE : ACCELERATION_RATE[mode];
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
  // Only charge that actually went in restarts the meter, not a plug pulled straight out.
  const charged = {
    ...state,
    batteryPercent,
    chargeSession,
    sinceChargeBaseline: meterBaseline(state),
  };
  if (batteryPercent < chargeLimit) return charged;
  return notify({ ...charged, chargeState: 'complete' }, 'Charging complete');
}

function moveDockItem(state: CarState, item: DockItem, delta: -1 | 1): CarState {
  const order = [...dockOrder(state)];
  const from = order.indexOf(item);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return state;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...state, dockByProfile: { ...state.dockByProfile, [state.activeProfileId]: order } };
}

const meterBaseline = (state: CarState): MeterBaseline => ({
  miles: state.odometerMiles,
  kwh: state.energyUsedKwh,
});

const withWifi = (state: CarState, patch: Partial<WifiState>): CarState => ({
  ...state,
  wifi: { ...state.wifi, ...patch },
});

const withBluetooth = (state: CarState, patch: Partial<BluetoothState>): CarState => ({
  ...state,
  bluetooth: { ...state.bluetooth, ...patch },
});

function finishWifiAttempt(state: CarState, networkId: string, password: string): CarState {
  const network = findWifiNetwork(networkId);
  if (!network) return withWifi(state, { attempt: null });

  const isSaved = state.wifi.savedIds.includes(networkId);
  const needsPassword = network.password !== null && !isSaved;
  const failure =
    network.failure ??
    (needsPassword && password !== network.password ? 'Incorrect password' : null);
  if (failure) {
    const failed = withWifi(state, { attempt: null, error: { networkId, message: failure } });
    return notify(failed, `Couldn't connect to ${network.ssid}`);
  }

  const connected = withWifi(state, {
    attempt: null,
    error: null,
    connectedId: networkId,
    savedIds: [networkId, ...state.wifi.savedIds.filter((id) => id !== networkId)],
  });
  return notify(connected, `Connected to ${network.ssid}`);
}

function finishBluetoothPairing(state: CarState, deviceId: string): CarState {
  const device = findBluetoothDevice(deviceId);
  if (!device) return withBluetooth(state, { pairing: null });

  if (device.failure) {
    const failed = withBluetooth(state, {
      pairing: null,
      error: { deviceId, message: device.failure },
    });
    return notify(failed, `Couldn't pair with ${device.name}`);
  }

  const paired = withBluetooth(state, {
    pairing: null,
    error: null,
    pairedIds: [...state.bluetooth.pairedIds, deviceId],
    connectedId: deviceId,
    // The first device paired is the one to prefer, until the driver says otherwise.
    priorityId: state.bluetooth.priorityId ?? deviceId,
  });
  return notify(paired, `Paired with ${device.name}`);
}

// Replays the boot sequence. Whatever was on screen goes, as it would on the real thing.
const restart = (state: CarState): CarState => ({
  ...state,
  surface: { kind: 'closed' },
  activeModal: null,
  notice: null,
  toasts: [],
  restartSecondsLeft: RESTART_SECONDS,
});

function tickHomeLink(state: CarState, seconds: number): CarState {
  const { door, doorPosition } = state.homelink;
  if (door !== 'opening' && door !== 'closing') return state;

  const step = seconds / GARAGE_DOOR_SECONDS;
  const position = door === 'opening' ? doorPosition + step : doorPosition - step;
  if (position > 0 && position < 1) {
    return { ...state, homelink: { ...state.homelink, doorPosition: position } };
  }
  const isOpen = door === 'opening';
  return notify(
    {
      ...state,
      homelink: {
        ...state.homelink,
        door: isOpen ? 'open' : 'closed',
        doorPosition: isOpen ? 1 : 0,
      },
    },
    `Garage door ${isOpen ? 'open' : 'closed'}`,
  );
}

function tickUpdate(state: CarState, seconds: number): CarState {
  const update = state.softwareUpdate;
  if (!('progress' in update)) return state;

  const progress = update.progress + (seconds / UPDATE_PHASE_SECONDS[update.phase]) * 100;
  if (progress < 100) return { ...state, softwareUpdate: { ...update, progress } };

  switch (update.phase) {
    case 'checking': {
      const version = offeredUpdate(state);
      if (!version) {
        return notify({ ...state, softwareUpdate: { phase: 'idle' } }, 'Software is up to date');
      }
      return { ...state, softwareUpdate: { phase: 'available', version } };
    }
    case 'downloading':
      return notify(
        { ...state, softwareUpdate: { phase: 'ready', version: update.version } },
        'Update ready to install',
      );
    case 'installing':
      return notify(
        restart({
          ...state,
          softwareUpdate: { phase: 'idle' },
          installedUpdate: update.version,
        }),
        `Updated to ${update.version}`,
      );
  }
}

function tickSystems(state: CarState, seconds: number): CarState {
  let next = tickUpdate(tickHomeLink(state, seconds), seconds);
  if (next.restartSecondsLeft > 0) {
    next = { ...next, restartSecondsLeft: Math.max(0, next.restartSecondsLeft - seconds) };
  }

  const { attempt } = next.wifi;
  if (attempt) {
    const secondsLeft = attempt.secondsLeft - seconds;
    next =
      secondsLeft > 0
        ? withWifi(next, { attempt: { ...attempt, secondsLeft } })
        : finishWifiAttempt(next, attempt.networkId, attempt.password);
  }

  const { pairing } = next.bluetooth;
  if (pairing?.phase === 'linking') {
    const secondsLeft = pairing.secondsLeft - seconds;
    next =
      secondsLeft > 0
        ? withBluetooth(next, { pairing: { ...pairing, secondsLeft } })
        : finishBluetoothPairing(next, pairing.deviceId);
  }

  return next;
}

const tick = (state: CarState, seconds: number): CarState =>
  tickSystems(tickVehicle(state, seconds), seconds);

function tickVehicle(state: CarState, seconds: number): CarState {
  if (state.chargeState === 'charging' && state.chargeHeld) return state;
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
    energyUsedKwh: state.energyUsedKwh + miles * PERCENT_PER_MILE * (PACK_KWH / 100),
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

export const isScheduleTime = (time: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const localDate = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const localTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

// Whether an entry should run at this moment, and the date to record if it does.
export function scheduleRunDate(entry: ScheduleEntry, now: Date): string | null {
  const date = localDate(now);
  if (!entry.enabled || entry.time !== localTime(now) || entry.lastRanOn === date) return null;
  return entry.days.length === 0 || entry.days.includes(now.getDay()) ? date : null;
}

const nextId = (items: { id: number }[]) => Math.max(0, ...items.map((item) => item.id)) + 1;

// A name the driver can tell apart from the others, or the reason it can't be used.
function checkName(
  items: { id: number; name: string }[],
  name: string,
  ownId?: number,
): { name: string } | { reason: string } {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return { reason: 'Enter a name' };
  const taken = items.some(
    (item) => item.id !== ownId && item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? { reason: `${trimmed} is already in use` } : { name: trimmed };
}

function moveItem<T extends { id: number }>(items: T[], id: number, offset: number): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const moved = [...items];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}

export function carReducer(state: CarState, action: CarAction): CarState {
  switch (action.type) {
    case 'gear/select': {
      if (action.gear === state.gear) return state;
      const permission = canShift(state, action.gear);
      if (permission.allowed) return shift(state, action.gear);
      const refused = notify(state, permission.reason);
      return permission.reason === DRIVE_PIN_REASON
        ? { ...refused, activeModal: 'drive-pin' }
        : refused;
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
        chargeHeld: state.schedule.some((entry) => entry.enabled && entry.kind === 'charge'),
      };

    // Unlatching lets the cable out, and the port closes behind it.
    case 'charge/unplug':
      return { ...state, chargeState: 'unplugged', chargePortOpen: false, chargeHeld: false };

    case 'charge/startNow':
      return { ...state, chargeHeld: false };

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
      return { ...state, tripMiles: 0, tripStartKwh: state.energyUsedKwh };

    case 'trip/add': {
      if (state.tripMeters.length >= MAX_TRIP_METERS) {
        return notify(state, `Up to ${MAX_TRIP_METERS} trip meters`);
      }
      const checked = checkName(state.tripMeters, action.name);
      if ('reason' in checked) return notify(state, checked.reason);
      const meter = { id: nextId(state.tripMeters), name: checked.name, ...meterBaseline(state) };
      return { ...state, tripMeters: [...state.tripMeters, meter] };
    }

    case 'trip/rename': {
      const checked = checkName(state.tripMeters, action.name, action.id);
      if ('reason' in checked) return notify(state, checked.reason);
      return {
        ...state,
        tripMeters: state.tripMeters.map((meter) =>
          meter.id === action.id ? { ...meter, name: checked.name } : meter,
        ),
      };
    }

    case 'trip/resetMeter':
      return {
        ...state,
        tripMeters: state.tripMeters.map((meter) =>
          meter.id === action.id ? { ...meter, ...meterBaseline(state) } : meter,
        ),
      };

    case 'trip/remove':
      return {
        ...state,
        tripMeters: state.tripMeters.filter((meter) => meter.id !== action.id),
      };

    case 'trip/move':
      return { ...state, tripMeters: moveItem(state.tripMeters, action.id, action.offset) };

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
      if (!permission.allowed) return notify(state, permission.reason);
      const next = applySettings(state, action.patch);
      return {
        ...next,
        easyEntryActive: state.easyEntryActive && next.settings.easyEntry,
        settings: next.settings.requireSafetyFeatures
          ? safetyFeaturesOn(next.settings)
          : next.settings,
      };
    }

    case 'speedLimit/enable': {
      if (!isValidPin(action.pin)) return notify(state, 'Choose a 4-digit PIN');
      return withPin(state, canSetSpeedLimit(state), action.pin, action.pin, () => ({
        speedLimitMode: true,
        speedLimitPin: action.pin,
      }));
    }

    case 'speedLimit/disable':
      return withPin(
        state,
        canSetSpeedLimit(state),
        action.pin,
        state.settings.speedLimitPin,
        () => ({ speedLimitMode: false, speedLimitPin: '' }),
      );

    case 'pinToDrive/enable': {
      if (!isValidPin(action.pin)) return notify(state, 'Choose a 4-digit PIN');
      const enabled = withPin(state, canSetPinToDrive(state), action.pin, action.pin, () => ({
        pinToDrive: true,
        drivePin: action.pin,
      }));
      return { ...enabled, driveUnlocked: false };
    }

    case 'pinToDrive/disable':
      return withPin(state, canSetPinToDrive(state), action.pin, state.settings.drivePin, () => ({
        pinToDrive: false,
        drivePin: '',
      }));

    case 'pinToDrive/unlock':
      return action.pin === state.settings.drivePin
        ? { ...state, driveUnlocked: true, activeModal: null }
        : notify(state, 'Incorrect PIN');

    // Real cars fall back on the owner's account. This one has no account, so a forgotten
    // PIN mustn't leave a saved session stuck for good.
    case 'tow/set': {
      const permission = canSetTowMode(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return { ...state, settings: { ...state.settings, towMode: action.enabled } };
    }

    case 'system/restart': {
      const permission = canRestartDisplay(state);
      return permission.allowed ? restart(state) : notify(state, permission.reason);
    }

    case 'software/check':
      return state.softwareUpdate.phase === 'idle'
        ? { ...state, softwareUpdate: { phase: 'checking', progress: 0 } }
        : state;

    case 'software/download': {
      const update = state.softwareUpdate;
      if (update.phase !== 'available') return state;
      return {
        ...state,
        softwareUpdate: { phase: 'downloading', version: update.version, progress: 0 },
      };
    }

    case 'software/install': {
      const update = state.softwareUpdate;
      if (update.phase !== 'ready') return state;
      const permission = canInstallUpdate(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return {
        ...state,
        softwareUpdate: { phase: 'installing', version: update.version, progress: 0 },
      };
    }

    case 'homelink/toggle': {
      const permission = canUseHomeLink(state);
      if (!permission.allowed) return notify(state, permission.reason);
      const { door } = state.homelink;
      const isGoingUp = door === 'closed' || door === 'closing';
      return {
        ...state,
        homelink: { ...state.homelink, door: isGoingUp ? 'opening' : 'closing' },
      };
    }

    case 'homelink/setHome':
      return {
        ...state,
        homelink: { ...state.homelink, homeOdometerMiles: state.odometerMiles },
      };

    case 'schedule/add': {
      if (!isScheduleTime(action.time)) return notify(state, 'Choose a time');
      const entry: ScheduleEntry = {
        id: nextId(state.schedule),
        kind: action.kind,
        time: action.time,
        days: [...action.days].sort(),
        enabled: true,
        lastRanOn: null,
      };
      return { ...state, schedule: [...state.schedule, entry] };
    }

    case 'schedule/remove':
      return { ...state, schedule: state.schedule.filter((entry) => entry.id !== action.id) };

    case 'schedule/enable':
      return {
        ...state,
        schedule: state.schedule.map((entry) =>
          entry.id === action.id ? { ...entry, enabled: action.enabled } : entry,
        ),
      };

    case 'schedule/run': {
      const entry = state.schedule.find(({ id }) => id === action.id);
      if (!entry) return state;
      const next: CarState = {
        ...state,
        schedule: state.schedule.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                lastRanOn: action.date,
                // A one-off entry has done its job.
                enabled: item.days.length > 0,
              }
            : item,
        ),
      };
      if (entry.kind === 'departure') {
        return notify(next, `Getting ready for your ${entry.time} departure`);
      }
      if (state.chargeHeld) {
        return notify({ ...next, chargeHeld: false }, 'Scheduled charging started');
      }
      return state.chargeState === 'unplugged'
        ? notify(next, 'Plug in to start scheduled charging')
        : next;
    }

    case 'wifi/enable': {
      if (!action.enabled) {
        return withWifi(state, { enabled: false, connectedId: null, attempt: null, error: null });
      }
      const [lastUsed] = state.wifi.savedIds;
      return withWifi(state, {
        enabled: true,
        attempt: lastUsed
          ? { networkId: lastUsed, password: '', secondsLeft: WIFI_CONNECT_SECONDS }
          : null,
      });
    }

    case 'wifi/connect': {
      const permission = canConnectWifi(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return withWifi(state, {
        connectedId: null,
        error: null,
        attempt: {
          networkId: action.id,
          password: action.password,
          secondsLeft: WIFI_CONNECT_SECONDS,
        },
      });
    }

    case 'wifi/disconnect':
      return withWifi(state, { connectedId: null, attempt: null });

    case 'wifi/forget':
      return withWifi(state, {
        savedIds: state.wifi.savedIds.filter((id) => id !== action.id),
        connectedId: state.wifi.connectedId === action.id ? null : state.wifi.connectedId,
      });

    case 'wifi/hotspot':
      return withWifi(state, { hotspot: action.enabled });

    case 'bluetooth/enable': {
      if (!action.enabled) {
        return withBluetooth(state, {
          enabled: false,
          connectedId: null,
          pairing: null,
          error: null,
        });
      }
      return withBluetooth(state, { enabled: true, connectedId: state.bluetooth.priorityId });
    }

    case 'bluetooth/pair': {
      const permission = canPairBluetooth(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return withBluetooth(state, {
        error: null,
        pairing: { deviceId: action.id, phase: 'confirm' },
      });
    }

    case 'bluetooth/confirm': {
      const { pairing } = state.bluetooth;
      if (pairing?.phase !== 'confirm') return state;
      return withBluetooth(state, {
        pairing: {
          deviceId: pairing.deviceId,
          phase: 'linking',
          secondsLeft: BLUETOOTH_LINK_SECONDS,
        },
      });
    }

    case 'bluetooth/cancel':
      return withBluetooth(state, { pairing: null });

    case 'bluetooth/connect': {
      const permission = canPairBluetooth(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return state.bluetooth.pairedIds.includes(action.id)
        ? withBluetooth(state, { connectedId: action.id })
        : state;
    }

    case 'bluetooth/disconnect':
      return withBluetooth(state, { connectedId: null });

    case 'bluetooth/forget': {
      const { connectedId, pairedIds, priorityId } = state.bluetooth;
      const remaining = pairedIds.filter((id) => id !== action.id);
      const nextPriority = priorityId === action.id ? (remaining[0] ?? null) : priorityId;
      return withBluetooth(state, {
        pairedIds: remaining,
        priorityId: nextPriority,
        // Losing the connected device hands over to the preferred one.
        connectedId: connectedId === action.id ? nextPriority : connectedId,
      });
    }

    case 'bluetooth/priority':
      return withBluetooth(state, { priorityId: action.id });

    case 'pins/reset': {
      const released = state.valet
        ? loadProfile({ ...state, valet: null }, state.valet.returnProfileId)
        : state;
      return notify(
        {
          ...released,
          activeModal: state.activeModal === 'drive-pin' ? null : state.activeModal,
          settings: {
            ...released.settings,
            speedLimitMode: false,
            speedLimitPin: '',
            pinToDrive: false,
            drivePin: '',
          },
        },
        'PINs cleared',
      );
    }

    case 'safety/require': {
      const permission = canRequireSafetyFeatures(state);
      if (!permission.allowed) return notify(state, permission.reason);
      const settings = { ...state.settings, requireSafetyFeatures: action.enabled };
      return { ...state, settings: action.enabled ? safetyFeaturesOn(settings) : settings };
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
        driveUnlocked: state.isLocked && state.driveUnlocked,
      };

    case 'signal/left':
      return { ...state, signal: state.signal === 'left' ? 'off' : 'left' };

    case 'signal/right':
      return { ...state, signal: state.signal === 'right' ? 'off' : 'right' };

    case 'signal/hazards':
      return { ...state, hazards: !state.hazards };

    case 'climate/temperature':
      return {
        ...state,
        climate: stepTemperature(state.climate, action.zone, action.delta),
      };

    case 'climate/cabin': {
      const { mode } = state.climate;
      const climate = setCabin(state.climate, action.patch);
      return mode && !climate.mode
        ? announceModeEnd({ ...state, climate }, mode, 'the climate was turned off')
        : { ...state, climate };
    }

    case 'climate/options':
      return { ...state, climate: setOptions(state.climate, action.options) };

    case 'climate/defrost':
      return { ...state, climate: toggleDefrost(state.climate, action.window) };

    case 'climate/seat': {
      const climate = cycleSeat(state.climate, action.seat, action.kind);
      return climate === state.climate ? state : { ...state, climate };
    }

    case 'climate/heat-auto':
      return { ...state, climate: toggleHeatAuto(state.climate) };

    case 'climate/mode': {
      if (state.climate.mode === action.mode) {
        return { ...state, climate: endMode(state.climate) };
      }
      const permission = canStartClimateMode(state);
      return permission.allowed
        ? { ...state, climate: startMode(state.climate, action.mode) }
        : notify(state, permission.reason);
    }

    case 'volume/set':
      return { ...state, volume: Math.min(100, Math.max(0, action.volume)) };

    case 'profile/select': {
      if (action.id === state.activeProfileId) return state;
      const permission = canSelectProfile(state, action.id);
      if (!permission.allowed) return notify(state, permission.reason);
      if (!state.profiles.some((profile) => profile.id === action.id)) return state;
      return loadProfile(saveActiveProfile(state), action.id);
    }

    case 'profile/add': {
      const permission = canEditProfiles(state);
      if (!permission.allowed) return notify(state, permission.reason);
      if (state.profiles.length >= MAX_PROFILES) {
        return notify(state, `Up to ${MAX_PROFILES - 1} drivers`);
      }
      const checked = checkName(state.profiles, action.name);
      if ('reason' in checked) return notify(state, checked.reason);
      const id = nextId(state.profiles);
      const added: Profile = {
        id,
        name: checked.name,
        image: profileImage(id),
        saved: snapshot(state),
      };
      // Valet stays last, under the drivers.
      const profiles = [...state.profiles.filter(isDriverProfile), added].concat(
        state.profiles.filter((profile) => !isDriverProfile(profile)),
      );
      return loadProfile(saveActiveProfile({ ...state, profiles }), id);
    }

    case 'profile/rename': {
      const permission = canEditProfiles(state);
      if (!permission.allowed) return notify(state, permission.reason);
      if (action.id === VALET_PROFILE_ID) return state;
      const checked = checkName(state.profiles, action.name, action.id);
      if ('reason' in checked) return notify(state, checked.reason);
      return {
        ...state,
        profiles: state.profiles.map((profile) =>
          profile.id === action.id ? { ...profile, name: checked.name } : profile,
        ),
      };
    }

    case 'profile/delete': {
      const permission = canEditProfiles(state);
      if (!permission.allowed) return notify(state, permission.reason);
      if (action.id === VALET_PROFILE_ID) return state;
      const drivers = state.profiles.filter(isDriverProfile);
      if (drivers.length <= 1) return notify(state, "The last driver can't be deleted");
      const profiles = state.profiles.filter((profile) => profile.id !== action.id);
      if (action.id !== state.activeProfileId) return { ...state, profiles };
      if (!isParked(state)) return notify(state, 'Shift to Park to delete the current driver');
      return loadProfile({ ...state, profiles }, profiles[0].id);
    }

    case 'cabin/set': {
      const permission = canEditProfiles(state);
      if (!permission.allowed) return notify(state, permission.reason);
      return { ...state, cabin: { ...state.cabin, ...action.patch } };
    }

    case 'valet/enter': {
      const permission = canEnterValet(state);
      if (!permission.allowed) return notify(state, permission.reason);
      if (!isValidPin(action.pin)) return notify(state, 'Choose a 4-digit PIN');
      const saved = saveActiveProfile(state);
      return notify(
        {
          ...saved,
          valet: { pin: action.pin, returnProfileId: state.activeProfileId },
          activeProfileId: VALET_PROFILE_ID,
          easyEntryActive: false,
        },
        'Valet Mode on',
      );
    }

    case 'valet/exit': {
      if (!state.valet) return state;
      const permission = canExitValet(state);
      if (!permission.allowed) return notify(state, permission.reason);
      if (action.pin !== state.valet.pin) return notify(state, 'Incorrect PIN');
      const back = loadProfile({ ...state, valet: null }, state.valet.returnProfileId);
      return notify(back, 'Valet Mode off');
    }

    case 'dock/move':
      return moveDockItem(state, action.item, action.delta);

    case 'notice/show':
      return notify(state, action.message);

    case 'notice/dismiss': {
      const toasts =
        action.id === undefined ? [] : state.toasts.filter((toast) => toast.id !== action.id);
      return { ...state, toasts, notice: toasts[0] ?? null };
    }

    case 'notifications/clear':
      return { ...state, notice: null, toasts: [], notifications: [], notificationsSeenId: 0 };

    case 'notifications/seen': {
      const newest = state.notifications[0]?.id ?? 0;
      return newest === state.notificationsSeenId
        ? state
        : { ...state, notificationsSeenId: newest };
    }

    default: {
      // Unreachable for typed callers; still guards against untyped dispatches.
      const unknown: { type: string } = action;
      throw new Error(`Unknown car action: ${unknown.type}`);
    }
  }
}

export { isAppId };
