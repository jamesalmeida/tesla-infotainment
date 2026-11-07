import { safeStorage } from '../utils/safeStorage';
import {
  ACCELERATION_MODES,
  APPEARANCES,
  CHILD_LOCK_MODES,
  DASHCAM_MODES,
  DISTANCE_UNITS,
  DOME_LIGHT_MODES,
  DRIVING_PROFILES,
  ENERGY_DISPLAYS,
  HEADLIGHT_MODES,
  KEY_KINDS,
  MAX_ADJUSTMENT,
  MAX_CHARGE_AMPS,
  MAX_CHARGE_LIMIT,
  MAX_FOLLOWING_DISTANCE,
  MAX_SPEED_OFFSET,
  MAX_TEMPERATURE,
  MIN_CHARGE_AMPS,
  MIN_CHARGE_LIMIT,
  MIN_FOLLOWING_DISTANCE,
  MIN_TEMPERATURE,
  PET_MODES,
  PRESSURE_UNITS,
  REGEN_MODES,
  STEERING_MODES,
  STOPPING_MODES,
  TEMPERATURE_UNITS,
  TIME_FORMATS,
  type CarKey,
  type CarState,
  type DisplaySettings,
  type Preferences,
  type VehicleSettings,
} from './carState';

const STORAGE_KEY = 'tesla-car-state';
const SCHEMA_VERSION = 1;
const SAVE_DELAY_MS = 250;

// Preferences only. Gear, open apps and closures are transient: a visit always starts in Park.
type Persisted = Pick<
  CarState,
  | 'temperature'
  | 'volume'
  | 'activeProfileId'
  | 'settings'
  | 'display'
  | 'batteryPercent'
  | 'odometerMiles'
  | 'tripMiles'
>;

const pickPersisted = ({
  temperature,
  volume,
  activeProfileId,
  settings,
  display,
  batteryPercent,
  odometerMiles,
  tripMiles,
}: CarState): Persisted => ({
  temperature,
  volume,
  activeProfileId,
  settings,
  display,
  batteryPercent,
  odometerMiles,
  tripMiles,
});

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Keeps only keys the app knows, holding the same type of value as the default.
function mergeKnown<T extends object>(defaults: T, saved: unknown): T {
  if (!isRecord(saved)) return defaults;
  const known = Object.entries(defaults).filter(
    ([key, fallback]) => typeof saved[key] === typeof fallback,
  );
  return { ...defaults, ...Object.fromEntries(known.map(([key]) => [key, saved[key]])) };
}

const VALID_WIPER_SPEEDS = [1, 2, 3, 4];

const isValidWipers = (wipers: unknown): boolean => {
  if (!isRecord(wipers)) return false;
  if (wipers.mode === 'off' || wipers.mode === 'auto') return true;
  return wipers.mode === 'manual' && VALID_WIPER_SPEEDS.includes(wipers.speed as number);
};

// A saved string is only as good as the union it claims to belong to.
function keepChoices<T extends object>(
  merged: T,
  defaults: T,
  choices: { [K in keyof T]?: readonly T[K][] },
): T {
  const result = { ...merged };
  for (const key of Object.keys(choices) as (keyof T)[]) {
    if (!choices[key]?.includes(merged[key])) result[key] = defaults[key];
  }
  return result;
}

const SETTING_CHOICES: { [K in keyof VehicleSettings]?: readonly VehicleSettings[K][] } = {
  headlights: HEADLIGHT_MODES,
  childLock: CHILD_LOCK_MODES,
  dashcamMode: DASHCAM_MODES,
  acceleration: ACCELERATION_MODES,
  steeringMode: STEERING_MODES,
  stoppingMode: STOPPING_MODES,
  regenBraking: REGEN_MODES,
  drivingProfile: DRIVING_PROFILES,
  domeLights: DOME_LIGHT_MODES,
  petMode: PET_MODES,
};

const PREFERENCE_CHOICES: { [K in keyof Preferences]: readonly Preferences[K][] } = {
  distance: DISTANCE_UNITS,
  temperature: TEMPERATURE_UNITS,
  tirePressure: PRESSURE_UNITS,
  energyDisplay: ENERGY_DISPLAYS,
  timeFormat: TIME_FORMATS,
};

const DISPLAY_CHOICES: { [K in keyof DisplaySettings]?: readonly DisplaySettings[K][] } = {
  appearance: APPEARANCES,
};

type NumericSetting = {
  [K in keyof VehicleSettings]: VehicleSettings[K] extends number ? K : never;
}[keyof VehicleSettings];

const SETTING_RANGES: Record<NumericSetting, [number, number]> = {
  chargeLimit: [MIN_CHARGE_LIMIT, MAX_CHARGE_LIMIT],
  chargeCurrent: [MIN_CHARGE_AMPS, MAX_CHARGE_AMPS],
  followingDistance: [MIN_FOLLOWING_DISTANCE, MAX_FOLLOWING_DISTANCE],
  speedOffset: [-MAX_SPEED_OFFSET, MAX_SPEED_OFFSET],
};

function keepRanges(merged: VehicleSettings, defaults: VehicleSettings): VehicleSettings {
  const result = { ...merged };
  for (const key of Object.keys(SETTING_RANGES) as NumericSetting[]) {
    const [min, max] = SETTING_RANGES[key];
    if (!inRange(merged[key], min, max)) result[key] = defaults[key];
  }
  return result;
}

const isAdjustment = (value: unknown): boolean =>
  isRecord(value) &&
  inRange(value.x, -MAX_ADJUSTMENT, MAX_ADJUSTMENT) &&
  inRange(value.y, -MAX_ADJUSTMENT, MAX_ADJUSTMENT);

const isCarKey = (value: unknown): value is CarKey =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  KEY_KINDS.includes(value.kind as CarKey['kind']);

const isKeyList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(isCarKey);

const isClockTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function restoreSettings(defaults: VehicleSettings, saved: unknown): VehicleSettings {
  const merged = keepRanges(
    keepChoices(mergeKnown(defaults, saved), defaults, SETTING_CHOICES),
    defaults,
  );
  const savedPreferences = isRecord(saved) ? saved.preferences : undefined;
  const keepIf = <K extends keyof VehicleSettings>(key: K, isValid: (v: unknown) => boolean) =>
    isValid(merged[key]) ? merged[key] : defaults[key];

  return {
    ...merged,
    wipers: keepIf('wipers', isValidWipers),
    keys: keepIf('keys', isKeyList),
    mirrorLeft: keepIf('mirrorLeft', isAdjustment),
    mirrorRight: keepIf('mirrorRight', isAdjustment),
    steeringWheel: keepIf('steeringWheel', isAdjustment),
    scheduledChargeTime: isClockTime(merged.scheduledChargeTime)
      ? merged.scheduledChargeTime
      : defaults.scheduledChargeTime,
    preferences: keepChoices(
      mergeKnown(defaults.preferences, savedPreferences),
      defaults.preferences,
      PREFERENCE_CHOICES,
    ),
  };
}

// Corrupt or outdated data must never reach the reducer, so anything invalid is dropped
// and the default for that value stays.
export function restoreState(defaults: CarState, raw: string | null): CarState {
  if (!raw) return defaults;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION || !isRecord(parsed.state)) {
    return defaults;
  }
  const saved = parsed.state;
  const display = keepChoices(
    mergeKnown(defaults.display, saved.display),
    defaults.display,
    DISPLAY_CHOICES,
  );

  return {
    ...defaults,
    temperature: inRange(saved.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE)
      ? saved.temperature
      : defaults.temperature,
    volume: inRange(saved.volume, 0, 100) ? saved.volume : defaults.volume,
    batteryPercent: inRange(saved.batteryPercent, 0, 100)
      ? saved.batteryPercent
      : defaults.batteryPercent,
    odometerMiles: inRange(saved.odometerMiles, 0, Number.MAX_SAFE_INTEGER)
      ? saved.odometerMiles
      : defaults.odometerMiles,
    tripMiles: inRange(saved.tripMiles, 0, Number.MAX_SAFE_INTEGER)
      ? saved.tripMiles
      : defaults.tripMiles,
    activeProfileId:
      typeof saved.activeProfileId === 'number' ? saved.activeProfileId : defaults.activeProfileId,
    settings: restoreSettings(defaults.settings, saved.settings),
    display: {
      ...display,
      brightness: inRange(display.brightness, 0, 100)
        ? display.brightness
        : defaults.display.brightness,
      blueLightReduction: inRange(display.blueLightReduction, 0, 100)
        ? display.blueLightReduction
        : defaults.display.blueLightReduction,
    },
  };
}

export const loadPersistedState = (defaults: CarState): CarState =>
  restoreState(defaults, safeStorage.getItem(STORAGE_KEY));

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSaved = '';

export function savePersistedState(state: CarState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const serialized = JSON.stringify({ version: SCHEMA_VERSION, state: pickPersisted(state) });
    if (serialized === lastSaved) return;
    lastSaved = serialized;
    safeStorage.setItem(STORAGE_KEY, serialized);
  }, SAVE_DELAY_MS);
}
