// The climate slice: its types and pure transitions, with no knowledge of the rest of the car.
// Rules that need the car, such as Park-only modes, live in carState.ts.

export const MIN_TEMPERATURE = 60;
export const MAX_TEMPERATURE = 90;
export const MIN_FAN_SPEED = 1;
export const MAX_FAN_SPEED = 10;

export const AIRFLOWS = ['face', 'feet', 'face-feet', 'windshield'] as const;
export type Airflow = (typeof AIRFLOWS)[number];

export const SEATS = ['driver', 'passenger', 'rear-left', 'rear-center', 'rear-right'] as const;
export type SeatId = (typeof SEATS)[number];

// Only the front seats are ventilated.
export const COOLED_SEATS: readonly SeatId[] = ['driver', 'passenger'];

// Above zero heats and below zero cools, so one seat can't be doing both.
export type SeatLevel = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type SeatHeat = SeatLevel | 'auto';
export type SeatKind = 'heat' | 'cool';

export const WHEEL_HEAT = ['off', 'on', 'auto'] as const;
export type WheelHeat = (typeof WHEEL_HEAT)[number];

export const CLIMATE_MODES = ['keep', 'dog', 'camp'] as const;
export type ClimateMode = (typeof CLIMATE_MODES)[number];

export const CLIMATE_MODE_LABELS: Record<ClimateMode, string> = {
  keep: 'Keep Climate',
  dog: 'Dog Mode',
  camp: 'Camp Mode',
};

export const OVERHEAT_PROTECTION = ['off', 'no-ac', 'on'] as const;
export type OverheatProtection = (typeof OVERHEAT_PROTECTION)[number];

export type TemperatureZone = 'driver' | 'passenger';

export type DefrostWindow = 'front' | 'rear';

// Everything front defrost takes over, and has to give back.
export interface CabinSettings {
  isOn: boolean;
  isAuto: boolean;
  fanSpeed: number;
  airflow: Airflow;
  recirculate: boolean;
  ac: boolean;
}

export interface ClimateState {
  cabin: CabinSettings;
  // Always equal to driverTemp unless isSplit.
  driverTemp: number;
  passengerTemp: number;
  isSplit: boolean;
  // Holding a snapshot is what "front defrost is on" means, so it can't be on with nothing
  // to go back to.
  beforeDefrost: CabinSettings | null;
  rearDefrost: boolean;
  seats: Record<SeatId, SeatHeat>;
  wheel: WheelHeat;
  // The climate stays on for as long as one of these runs.
  mode: ClimateMode | null;
  overheatProtection: OverheatProtection;
}

export type ClimateOptions = Partial<
  Pick<ClimateState, 'isSplit' | 'wheel' | 'overheatProtection'>
>;

const FRONT_DEFROST: CabinSettings = {
  isOn: true,
  isAuto: false,
  fanSpeed: MAX_FAN_SPEED,
  airflow: 'windshield',
  recirculate: false,
  ac: true,
};

export const initialClimate: ClimateState = {
  cabin: {
    isOn: true,
    isAuto: true,
    fanSpeed: 4,
    airflow: 'face',
    recirculate: false,
    ac: true,
  },
  driverTemp: 70,
  passengerTemp: 70,
  isSplit: false,
  beforeDefrost: null,
  rearDefrost: false,
  seats: { driver: 0, passenger: 0, 'rear-left': 0, 'rear-center': 0, 'rear-right': 0 },
  wheel: 'off',
  mode: null,
  overheatProtection: 'on',
};

/* -------------------- Selectors -------------------- */

export const isFrontDefrostOn = (climate: ClimateState): boolean => climate.beforeDefrost !== null;

export const isHeatAuto = (climate: ClimateState): boolean =>
  climate.wheel === 'auto' && SEATS.every((seat) => climate.seats[seat] === 'auto');

export const seatHeatLabel = (heat: SeatHeat): string => {
  if (heat === 'auto') return 'Auto';
  if (heat === 0) return 'Off';
  return `${heat > 0 ? 'Heat' : 'Cool'} ${Math.abs(heat)}`;
};

// What survives a reload. While defrost runs, the user's own settings are in the snapshot and
// the cabin only holds defrost's, which would otherwise come back with no way to undo them.
export const climatePreferences = ({
  cabin,
  beforeDefrost,
  driverTemp,
  passengerTemp,
  isSplit,
  seats,
  wheel,
  overheatProtection,
}: ClimateState) => ({
  cabin: beforeDefrost ?? cabin,
  driverTemp,
  passengerTemp,
  isSplit,
  seats,
  wheel,
  overheatProtection,
});

/* -------------------- Transitions -------------------- */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clampTemperature = (value: number) => clamp(value, MIN_TEMPERATURE, MAX_TEMPERATURE);

// Without split there is one temperature, whichever control moved it.
export function stepTemperature(
  climate: ClimateState,
  zone: TemperatureZone,
  delta: number,
): ClimateState {
  if (!climate.isSplit) {
    const temperature = clampTemperature(climate.driverTemp + delta);
    return { ...climate, driverTemp: temperature, passengerTemp: temperature };
  }
  return zone === 'driver'
    ? { ...climate, driverTemp: clampTemperature(climate.driverTemp + delta) }
    : { ...climate, passengerTemp: clampTemperature(climate.passengerTemp + delta) };
}

// Sets a zone to an exact temperature, which voice commands and any future keypad can use.
export function setTemperature(
  climate: ClimateState,
  zone: TemperatureZone,
  value: number,
): ClimateState {
  const temperature = clampTemperature(value);
  if (!climate.isSplit) {
    return { ...climate, driverTemp: temperature, passengerTemp: temperature };
  }
  return zone === 'driver'
    ? { ...climate, driverTemp: temperature }
    : { ...climate, passengerTemp: temperature };
}

export function setOptions(climate: ClimateState, options: ClimateOptions): ClimateState {
  const next = { ...climate, ...options };
  return next.isSplit ? next : { ...next, passengerTemp: next.driverTemp };
}

function applyCabin(cabin: CabinSettings, patch: Partial<CabinSettings>): CabinSettings {
  const next = { ...cabin, ...patch };
  if (patch.fanSpeed !== undefined) {
    next.fanSpeed = clamp(patch.fanSpeed, MIN_FAN_SPEED, MAX_FAN_SPEED);
  }
  // Picking the fan or the vents by hand overrides Auto and needs the system running.
  if (patch.fanSpeed !== undefined || patch.airflow !== undefined) {
    return { ...next, isOn: true, isAuto: false };
  }
  return patch.isAuto ? { ...next, isOn: true } : next;
}

const isFanOnly = (patch: Partial<CabinSettings>) =>
  Object.keys(patch).every((key) => key === 'fanSpeed');

// Fan speed can be trimmed during front defrost. Any other change ends it: the snapshot comes
// back with that change on top, so nothing the user chose before defrost is lost.
export function setCabin(climate: ClimateState, patch: Partial<CabinSettings>): ClimateState {
  const { beforeDefrost } = climate;
  const next =
    beforeDefrost && !isFanOnly(patch)
      ? { ...climate, cabin: applyCabin(beforeDefrost, patch), beforeDefrost: null }
      : { ...climate, cabin: applyCabin(climate.cabin, patch) };
  return next.cabin.isOn ? next : endMode(next);
}

// A quick tap on the fan: wakes the system at its last speed, then steps up and wraps around.
export const nextFanSpeed = ({ isOn, fanSpeed }: CabinSettings): number =>
  isOn ? (fanSpeed % MAX_FAN_SPEED) + 1 : fanSpeed;

export function toggleDefrost(climate: ClimateState, window: DefrostWindow): ClimateState {
  if (window === 'rear') return { ...climate, rearDefrost: !climate.rearDefrost };
  return climate.beforeDefrost
    ? { ...climate, cabin: climate.beforeDefrost, beforeDefrost: null }
    : { ...climate, cabin: FRONT_DEFROST, beforeDefrost: climate.cabin };
}

const SEAT_CYCLE: Record<SeatKind, SeatLevel[]> = {
  heat: [0, 3, 2, 1],
  cool: [0, -3, -2, -1],
};

// Strongest first, as in the real car. Auto and the opposite kind aren't in the cycle, so a
// tap on either turns the seat off first.
export function cycleSeat(climate: ClimateState, seat: SeatId, kind: SeatKind): ClimateState {
  if (kind === 'cool' && !COOLED_SEATS.includes(seat)) return climate;
  const cycle = SEAT_CYCLE[kind];
  const index = cycle.indexOf(climate.seats[seat] as SeatLevel);
  return {
    ...climate,
    seats: { ...climate.seats, [seat]: cycle[(index + 1) % cycle.length] },
  };
}

// One switch for every seat and the wheel, which then stay individually adjustable.
export function toggleHeatAuto(climate: ClimateState): ClimateState {
  const isAuto = isHeatAuto(climate);
  const seat: SeatHeat = isAuto ? 0 : 'auto';
  return {
    ...climate,
    seats: Object.fromEntries(SEATS.map((id) => [id, seat])) as Record<SeatId, SeatHeat>,
    wheel: isAuto ? 'off' : 'auto',
  };
}

const switchedOn = (cabin: CabinSettings): CabinSettings => ({ ...cabin, isOn: true });

// The snapshot is switched on too, or ending defrost would turn the climate off under the mode.
export const startMode = (climate: ClimateState, mode: ClimateMode): ClimateState => ({
  ...climate,
  mode,
  cabin: switchedOn(climate.cabin),
  beforeDefrost: climate.beforeDefrost && switchedOn(climate.beforeDefrost),
});

export function endMode(climate: ClimateState): ClimateState {
  return climate.mode ? { ...climate, mode: null } : climate;
}
