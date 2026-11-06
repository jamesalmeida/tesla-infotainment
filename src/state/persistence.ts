import { safeStorage } from '../utils/safeStorage';
import { MAX_TEMPERATURE, MIN_TEMPERATURE, type CarState } from './carState';

const STORAGE_KEY = 'tesla-car-state';
const SCHEMA_VERSION = 1;
const SAVE_DELAY_MS = 250;

// Preferences only. Gear, open apps and closures are transient: a visit always starts in Park.
type Persisted = Pick<
  CarState,
  'temperature' | 'volume' | 'activeProfileId' | 'settings' | 'display'
>;

const pickPersisted = ({
  temperature,
  volume,
  activeProfileId,
  settings,
  display,
}: CarState): Persisted => ({ temperature, volume, activeProfileId, settings, display });

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
  const settings = mergeKnown(defaults.settings, saved.settings);
  const display = mergeKnown(defaults.display, saved.display);

  return {
    ...defaults,
    temperature: inRange(saved.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE)
      ? saved.temperature
      : defaults.temperature,
    volume: inRange(saved.volume, 0, 100) ? saved.volume : defaults.volume,
    activeProfileId:
      typeof saved.activeProfileId === 'number' ? saved.activeProfileId : defaults.activeProfileId,
    settings: {
      ...settings,
      wipers: isValidWipers(settings.wipers) ? settings.wipers : defaults.settings.wipers,
    },
    display: {
      ...display,
      brightness: inRange(display.brightness, 0, 100)
        ? display.brightness
        : defaults.display.brightness,
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
