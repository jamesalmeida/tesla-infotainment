import { DOCK } from '../apps/registry';
import { safeStorage } from '../utils/safeStorage';
import {
  isScheduleTime,
  isValidPin,
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
  MAX_NAME_LENGTH,
  MAX_SPEED,
  MAX_SPEED_OFFSET,
  MAX_TEMPERATURE,
  MAX_TRIP_METERS,
  MIN_CHARGE_AMPS,
  MIN_CHARGE_LIMIT,
  MIN_FOLLOWING_DISTANCE,
  MIN_SPEED_LIMIT,
  MIN_TEMPERATURE,
  PET_MODES,
  PRESSURE_UNITS,
  REGEN_MODES,
  STEERING_MODES,
  STOPPING_MODES,
  TEMPERATURE_UNITS,
  TIRE_CORNERS,
  TIME_FORMATS,
  type CarKey,
  type CarState,
  type DisplaySettings,
  type MeterBaseline,
  type BluetoothState,
  type Preferences,
  type ScheduleEntry,
  type TirePressures,
  type TripMeter,
  type WifiState,
  type ValetSession,
  type VehicleSettings,
} from './carState';
import {
  AIRFLOWS,
  climatePreferences,
  COOLED_SEATS,
  MAX_FAN_SPEED,
  MIN_FAN_SPEED,
  OVERHEAT_PROTECTION,
  SEATS,
  WHEEL_HEAT,
  type ClimateState,
  type SeatHeat,
  type SeatId,
} from './climate';
import {
  DEFAULT_PROFILES,
  isDriverProfile,
  MAX_PROFILES,
  PROFILE_SETTING_KEYS,
  profileImage,
  restoreDefaultName,
  VALET_PROFILE_ID,
  type CabinPosition,
  type Profile,
  type ProfileSettings,
  type ProfileSnapshot,
} from './profiles';
import {
  DEMO_UPDATES,
  findBluetoothDevice,
  findWifiNetwork,
  PAINT_COLORS,
  WHEEL_OPTIONS,
} from './sampleData';

const STORAGE_KEY = 'tesla-car-state';
const SCHEMA_VERSION = 1;
const SAVE_DELAY_MS = 250;

// Preferences only. Gear, open apps, closures, defrost and climate modes are transient: a
// visit always starts in Park with nothing running.
type Persisted = {
  climate: ReturnType<typeof climatePreferences>;
} & Pick<
  CarState,
  | 'volume'
  | 'activeProfileId'
  | 'dockByProfile'
  | 'settings'
  | 'display'
  | 'batteryPercent'
  | 'tirePressures'
  | 'odometerMiles'
  | 'tripMiles'
  | 'energyUsedKwh'
  | 'tripStartKwh'
  | 'sinceChargeBaseline'
  | 'tripMeters'
  | 'profiles'
  | 'valet'
  | 'cabin'
  | 'wifi'
  | 'bluetooth'
  | 'homelink'
  | 'installedUpdate'
  | 'schedule'
>;

const pickPersisted = ({
  climate,
  volume,
  activeProfileId,
  dockByProfile,
  settings,
  display,
  batteryPercent,
  tirePressures,
  odometerMiles,
  tripMiles,
  energyUsedKwh,
  tripStartKwh,
  sinceChargeBaseline,
  tripMeters,
  profiles,
  valet,
  cabin,
  wifi,
  bluetooth,
  homelink,
  installedUpdate,
  schedule,
}: CarState): Persisted => ({
  climate: climatePreferences(climate),
  volume,
  activeProfileId,
  dockByProfile,
  settings,
  display,
  batteryPercent,
  tirePressures,
  odometerMiles,
  tripMiles,
  energyUsedKwh,
  tripStartKwh,
  sinceChargeBaseline,
  tripMeters,
  profiles,
  valet,
  cabin,
  // A connection in progress doesn't outlive the page.
  wifi: { ...wifi, attempt: null, error: null },
  bluetooth: { ...bluetooth, pairing: null, error: null },
  // A visit starts with the door shut, so only home itself matters.
  homelink: { door: 'closed', doorPosition: 0, homeOdometerMiles: homelink.homeOdometerMiles },
  installedUpdate,
  schedule,
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

const SETTING_RANGES: Partial<Record<NumericSetting, [number, number]>> = {
  chargeLimit: [MIN_CHARGE_LIMIT, MAX_CHARGE_LIMIT],
  chargeCurrent: [MIN_CHARGE_AMPS, MAX_CHARGE_AMPS],
  followingDistance: [MIN_FOLLOWING_DISTANCE, MAX_FOLLOWING_DISTANCE],
  speedOffset: [-MAX_SPEED_OFFSET, MAX_SPEED_OFFSET],
};

function keepRanges(merged: VehicleSettings, defaults: VehicleSettings): VehicleSettings {
  const result = { ...merged };
  for (const key of Object.keys(SETTING_RANGES) as NumericSetting[]) {
    const range = SETTING_RANGES[key];
    if (range && !inRange(merged[key], ...range)) result[key] = defaults[key];
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

const oneOfOr = <T>(options: readonly T[], value: unknown, fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

const isValidSeat = (seat: SeatId, heat: unknown): heat is SeatHeat => {
  if (heat === 'auto') return true;
  if (typeof heat !== 'number' || !Number.isInteger(heat)) return false;
  return inRange(heat, COOLED_SEATS.includes(seat) ? -3 : 0, 3);
};

const isTemperature = (value: unknown): value is number =>
  inRange(value, MIN_TEMPERATURE, MAX_TEMPERATURE);

// `legacyTemperature` is the single value saved before split temperature existed.
function restoreClimate(
  defaults: ClimateState,
  saved: unknown,
  legacyTemperature: unknown,
): ClimateState {
  const climate = isRecord(saved) ? saved : {};
  const seats = isRecord(climate.seats) ? climate.seats : {};
  const cabin = mergeKnown(defaults.cabin, climate.cabin);
  const isSplit = climate.isSplit === true;
  const driverTemp =
    [climate.driverTemp, legacyTemperature].find(isTemperature) ?? defaults.driverTemp;

  return {
    ...defaults,
    cabin: {
      ...cabin,
      fanSpeed:
        Number.isInteger(cabin.fanSpeed) && inRange(cabin.fanSpeed, MIN_FAN_SPEED, MAX_FAN_SPEED)
          ? cabin.fanSpeed
          : defaults.cabin.fanSpeed,
      airflow: oneOfOr(AIRFLOWS, cabin.airflow, defaults.cabin.airflow),
    },
    driverTemp,
    passengerTemp:
      isSplit && isTemperature(climate.passengerTemp) ? climate.passengerTemp : driverTemp,
    isSplit,
    seats: Object.fromEntries(
      SEATS.map((seat) => {
        const heat = seats[seat];
        return [seat, isValidSeat(seat, heat) ? heat : defaults.seats[seat]];
      }),
    ) as ClimateState['seats'],
    wheel: oneOfOr(WHEEL_HEAT, climate.wheel, defaults.wheel),
    overheatProtection: oneOfOr(
      OVERHEAT_PROTECTION,
      climate.overheatProtection,
      defaults.overheatProtection,
    ),
  };
}

// A saved order only counts if it holds exactly today's dock, so an app added or removed since
// falls back to the default instead of vanishing.
const isDockOrder = (order: unknown): boolean =>
  Array.isArray(order) &&
  order.length === DOCK.length &&
  DOCK.every((item) => order.includes(item));

const restoreDock = (saved: unknown): CarState['dockByProfile'] =>
  isRecord(saved)
    ? (Object.fromEntries(
        Object.entries(saved).filter(([, order]) => isDockOrder(order)),
      ) as CarState['dockByProfile'])
    : {};

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= MAX_NAME_LENGTH;

const oneOf =
  (...options: unknown[]) =>
  (value: unknown): boolean =>
    options.includes(value);

const between =
  (min: number, max: number) =>
  (value: unknown): boolean =>
    inRange(value, min, max);

const isPlate = (value: unknown): boolean =>
  typeof value === 'string' && value.length <= 8 && /^[A-Za-z0-9 ]*$/.test(value);

const isSavedPin = (value: unknown): boolean =>
  value === '' || (typeof value === 'string' && isValidPin(value));

const isSuperchargerFilters = (value: unknown): boolean =>
  isRecord(value) &&
  [0, 150, 250].includes(value.minPowerKw as number) &&
  typeof value.food === 'boolean' &&
  typeof value.restrooms === 'boolean' &&
  typeof value.shopping === 'boolean';

// mergeKnown only checks a value's type, so anything narrower than that is checked here.
const SETTING_RULES: { [K in keyof VehicleSettings]?: (value: unknown) => boolean } = {
  wipers: isValidWipers,
  acceleration: oneOf('chill', 'standard', 'sport'),
  mapUnits: oneOf('mi', 'km'),
  arrivalChargeTarget: between(0, 50),
  superchargerFilters: isSuperchargerFilters,
  navVolume: between(0, 100),
  eqBass: between(-6, 6),
  eqMid: between(-6, 6),
  eqTreble: between(-6, 6),
  audioBalance: between(-10, 10),
  audioFade: between(-10, 10),
  immersiveSound: oneOf('off', 'standard', 'high'),
  assistantStyle: oneOf('friendly', 'concise', 'playful'),
  collisionWarning: oneOf('off', 'late', 'average', 'early'),
  speedLimitMph: between(MIN_SPEED_LIMIT, MAX_SPEED),
  speedLimitPin: isSavedPin,
  drivePin: isSavedPin,
  vehicleName: isName,
  paint: oneOf(...PAINT_COLORS.map(({ value }) => value)),
  licensePlate: isPlate,
  updatePreference: oneOf(...Object.keys(DEMO_UPDATES)),
  wheelConfig: oneOf(...WHEEL_OPTIONS.map(({ value }) => value)),
};

function applySettingRules<T extends Partial<VehicleSettings>>(settings: T, defaults: T): T {
  const checked = { ...settings };
  for (const key of Object.keys(settings) as (keyof T & keyof VehicleSettings)[]) {
    const rule = SETTING_RULES[key];
    if (rule && !rule(settings[key])) checked[key] = defaults[key];
  }
  return checked;
}

const isBaseline = (value: unknown): value is MeterBaseline =>
  isRecord(value) &&
  inRange(value.miles, 0, Number.MAX_SAFE_INTEGER) &&
  inRange(value.kwh, 0, Number.MAX_SAFE_INTEGER);

const isTripMeter = (value: unknown): value is TripMeter =>
  isBaseline(value) &&
  Number.isInteger((value as Partial<TripMeter>).id) &&
  isName((value as Partial<TripMeter>).name);

const restoreTripMeters = (saved: unknown, defaults: TripMeter[]): TripMeter[] =>
  Array.isArray(saved) ? saved.filter(isTripMeter).slice(0, MAX_TRIP_METERS) : defaults;

const restoreCabin = (saved: unknown, defaults: CabinPosition): CabinPosition => {
  const merged = mergeKnown(defaults, saved);
  const entries = Object.entries(merged) as [keyof CabinPosition, number][];
  return Object.fromEntries(
    entries.map(([key, value]) => [key, inRange(value, 0, 100) ? value : defaults[key]]),
  ) as unknown as CabinPosition;
};

const restoreTirePressures = (saved: unknown, defaults: TirePressures): TirePressures => {
  const merged = mergeKnown(defaults, saved);
  return Object.fromEntries(
    TIRE_CORNERS.map((corner) => [
      corner,
      inRange(merged[corner], 0, 100) ? merged[corner] : defaults[corner],
    ]),
  ) as TirePressures;
};

const restoreProfileSettings = (saved: unknown, defaults: VehicleSettings): ProfileSettings => {
  const profileDefaults = Object.fromEntries(
    PROFILE_SETTING_KEYS.map((key) => [key, defaults[key]]),
  ) as unknown as ProfileSettings;
  return applySettingRules(mergeKnown(profileDefaults, saved), profileDefaults);
};

const restoreSnapshot = (saved: unknown, defaults: CarState): ProfileSnapshot | null => {
  if (!isRecord(saved)) return null;
  const display = mergeKnown(defaults.display, saved.display);
  return {
    cabin: restoreCabin(saved.cabin, defaults.cabin),
    temperature: inRange(saved.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE)
      ? saved.temperature
      : defaults.climate.driverTemp,
    volume: inRange(saved.volume, 0, 100) ? saved.volume : defaults.volume,
    display: inRange(display.brightness, 0, 100) ? display : defaults.display,
    settings: restoreProfileSettings(saved.settings, defaults.settings),
  };
};

// Drivers come from the save; Valet is always the car's own entry, and always there.
function restoreProfiles(saved: unknown, defaults: CarState): Profile[] {
  if (!Array.isArray(saved)) return defaults.profiles;
  const drivers = saved
    .filter(
      (profile): profile is Record<string, unknown> =>
        isRecord(profile) &&
        Number.isInteger(profile.id) &&
        profile.id !== VALET_PROFILE_ID &&
        isName(profile.name),
    )
    .slice(0, MAX_PROFILES - 1)
    .map((profile) => ({
      id: profile.id as number,
      name: restoreDefaultName(profile.id as number, profile.name as string),
      image: profileImage(profile.id as number),
      saved: restoreSnapshot(profile.saved, defaults),
    }));
  if (drivers.length === 0) return defaults.profiles;
  return [...drivers, ...DEFAULT_PROFILES.filter((profile) => !isDriverProfile(profile))];
}

const isValetSession = (value: unknown): value is ValetSession =>
  isRecord(value) &&
  typeof value.pin === 'string' &&
  isValidPin(value.pin) &&
  typeof value.returnProfileId === 'number';

// Valet is only ever active with a session behind it, so a save from before there was a PIN
// can't start a visit locked in with no way out.
function restoreActiveProfile(
  saved: unknown,
  profiles: Profile[],
  valet: ValetSession | null,
  fallback: number,
): number {
  if (valet) return VALET_PROFILE_ID;
  const drivers = profiles.filter(isDriverProfile);
  const match = drivers.find(({ id }) => id === saved) ?? drivers.find(({ id }) => id === fallback);
  return (match ?? drivers[0]).id;
}

const knownIds = (saved: unknown, isKnown: (id: string) => boolean): string[] =>
  Array.isArray(saved)
    ? saved.filter((id): id is string => typeof id === 'string' && isKnown(id))
    : [];

// Only sample networks and devices exist, so an id for anything else is stale.
function restoreWifi(saved: unknown, defaults: WifiState): WifiState {
  const wifi = mergeKnown(defaults, saved);
  const savedIds = knownIds(isRecord(saved) ? saved.savedIds : null, (id) =>
    Boolean(findWifiNetwork(id)),
  );
  const connectedId = isRecord(saved) ? saved.connectedId : null;
  return {
    ...defaults,
    enabled: wifi.enabled,
    hotspot: wifi.hotspot,
    savedIds,
    connectedId:
      wifi.enabled && typeof connectedId === 'string' && savedIds.includes(connectedId)
        ? connectedId
        : null,
  };
}

function restoreBluetooth(saved: unknown, defaults: BluetoothState): BluetoothState {
  const bluetooth = mergeKnown(defaults, saved);
  const pairedIds = knownIds(isRecord(saved) ? saved.pairedIds : null, (id) =>
    Boolean(findBluetoothDevice(id)),
  );
  const paired = (id: unknown) => (typeof id === 'string' && pairedIds.includes(id) ? id : null);
  return {
    ...defaults,
    enabled: bluetooth.enabled,
    pairedIds,
    connectedId: bluetooth.enabled && isRecord(saved) ? paired(saved.connectedId) : null,
    priorityId: isRecord(saved) ? paired(saved.priorityId) : null,
  };
}

const isScheduleEntry = (value: unknown): value is ScheduleEntry =>
  isRecord(value) &&
  Number.isInteger(value.id) &&
  (value.kind === 'charge' || value.kind === 'departure') &&
  typeof value.time === 'string' &&
  isScheduleTime(value.time) &&
  Array.isArray(value.days) &&
  value.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
  typeof value.enabled === 'boolean' &&
  (value.lastRanOn === null || typeof value.lastRanOn === 'string');

// A mode that needs a PIN can't be on without one, or nothing could ever turn it off.
const withPinModesIntact = (settings: VehicleSettings): VehicleSettings => ({
  ...settings,
  speedLimitMode: settings.speedLimitMode && settings.speedLimitPin !== '',
  pinToDrive: settings.pinToDrive && settings.drivePin !== '',
});

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
  const profiles = restoreProfiles(saved.profiles, defaults);
  const valet = isValetSession(saved.valet) ? saved.valet : null;

  return {
    ...defaults,
    climate: restoreClimate(defaults.climate, saved.climate, saved.temperature),
    volume: inRange(saved.volume, 0, 100) ? saved.volume : defaults.volume,
    batteryPercent: inRange(saved.batteryPercent, 0, 100)
      ? saved.batteryPercent
      : defaults.batteryPercent,
    tirePressures: restoreTirePressures(saved.tirePressures, defaults.tirePressures),
    odometerMiles: inRange(saved.odometerMiles, 0, Number.MAX_SAFE_INTEGER)
      ? saved.odometerMiles
      : defaults.odometerMiles,
    tripMiles: inRange(saved.tripMiles, 0, Number.MAX_SAFE_INTEGER)
      ? saved.tripMiles
      : defaults.tripMiles,
    energyUsedKwh: inRange(saved.energyUsedKwh, 0, Number.MAX_SAFE_INTEGER)
      ? saved.energyUsedKwh
      : defaults.energyUsedKwh,
    tripStartKwh: inRange(saved.tripStartKwh, 0, Number.MAX_SAFE_INTEGER)
      ? saved.tripStartKwh
      : defaults.tripStartKwh,
    sinceChargeBaseline: isBaseline(saved.sinceChargeBaseline)
      ? saved.sinceChargeBaseline
      : defaults.sinceChargeBaseline,
    tripMeters: restoreTripMeters(saved.tripMeters, defaults.tripMeters),
    activeProfileId: restoreActiveProfile(
      saved.activeProfileId,
      profiles,
      valet,
      defaults.activeProfileId,
    ),
    profiles,
    valet,
    cabin: restoreCabin(saved.cabin, defaults.cabin),
    wifi: restoreWifi(saved.wifi, defaults.wifi),
    bluetooth: restoreBluetooth(saved.bluetooth, defaults.bluetooth),
    homelink: {
      ...defaults.homelink,
      homeOdometerMiles:
        isRecord(saved.homelink) &&
        inRange(saved.homelink.homeOdometerMiles, 0, Number.MAX_SAFE_INTEGER)
          ? saved.homelink.homeOdometerMiles
          : defaults.homelink.homeOdometerMiles,
    },
    installedUpdate:
      typeof saved.installedUpdate === 'string' ? saved.installedUpdate : defaults.installedUpdate,
    schedule: Array.isArray(saved.schedule)
      ? saved.schedule.filter(isScheduleEntry)
      : defaults.schedule,
    dockByProfile: restoreDock(saved.dockByProfile),
    settings: withPinModesIntact(
      applySettingRules(restoreSettings(defaults.settings, saved.settings), defaults.settings),
    ),
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

export const serializeState = (state: CarState): string =>
  JSON.stringify({ version: SCHEMA_VERSION, state: pickPersisted(state) });

export function savePersistedState(state: CarState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const serialized = serializeState(state);
    if (serialized === lastSaved) return;
    lastSaved = serialized;
    safeStorage.setItem(STORAGE_KEY, serialized);
  }, SAVE_DELAY_MS);
}
