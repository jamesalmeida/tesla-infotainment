import { useEffect, useSyncExternalStore } from 'react';
import { useCar } from '../state/CarStateContext';
import { FULL_RANGE_MILES } from '../state/carState';
import { safeStorage } from '../utils/safeStorage';

export interface EnergySample {
  // Milliseconds since the epoch.
  t: number;
  odometerMiles: number;
  batteryPercent: number;
  speed: number;
  charging: boolean;
}

export interface EnergyShare {
  label: string;
  kwh: number;
  share: number;
}

export interface TripPrediction {
  energyKwh: number;
  arrivalPercent: number;
  reachable: boolean;
}

const STORAGE_KEY = 'tesla-energy-history';
const SAVE_EVERY_MS = 10000;
const MIN_SAMPLE_MS = 1000;
export const MAX_SAMPLES = 900;
const CHART_BUCKETS = 30;

export const BATTERY_KWH = 75;
// What the simulator actually drains, whatever the speed.
export const RATED_WH_PER_MILE = (BATTERY_KWH * 1000) / FULL_RANGE_MILES;

// The simulator drains the battery by distance alone, so these weights only shape the graphs and
// the breakdown. Totals always come from the battery itself.
const ROLLING_LOAD = 0.55;
const AERO_LOAD = 0.45;
const AERO_REFERENCE_MPH = 60;
const ACCELERATION_LOAD = 0.08;
const REGEN_RECOVERY = 0.6;
const MIN_LOAD = 0.1;
const ACCESSORIES_SHARE = 0.03;
const COMFORTABLE_CABIN = 70;

const aeroLoad = (speed: number) => AERO_LOAD * (speed / AERO_REFERENCE_MPH) ** 2;

const accelerationBetween = (from: EnergySample, to: EnergySample): number => {
  const seconds = (to.t - from.t) / 1000;
  return seconds > 0 ? (to.speed - from.speed) / seconds : 0;
};

const accelerationLoad = (acceleration: number) =>
  ACCELERATION_LOAD * acceleration * (acceleration < 0 ? REGEN_RECOVERY : 1);

// Relative energy per mile at this speed and acceleration, where 1 is the rated figure.
export const relativeLoad = (speed: number, acceleration: number): number =>
  Math.max(MIN_LOAD, ROLLING_LOAD + aeroLoad(speed) + accelerationLoad(acceleration));

// Negative while regenerative braking is putting energy back.
export const estimatedPowerKw = (speed: number, acceleration: number): number => {
  const load = ROLLING_LOAD + aeroLoad(speed) + accelerationLoad(acceleration);
  return (RATED_WH_PER_MILE * load * speed) / 1000;
};

// Only changes are worth keeping, so a parked car doesn't fill the history.
export function shouldSample(last: EnergySample | undefined, next: EnergySample): boolean {
  const isChanging = next.speed > 0 || next.charging;
  if (!last) return isChanging;
  if (next.t - last.t < MIN_SAMPLE_MS) return false;
  return isChanging || last.speed > 0 || last.charging;
}

export const addSample = (history: EnergySample[], sample: EnergySample): EnergySample[] =>
  [...history, sample].slice(-MAX_SAMPLES);

// A stretch of driving between two samples. Charging in between is not consumption.
function drivenBetween(from: EnergySample, to: EnergySample) {
  const miles = to.odometerMiles - from.odometerMiles;
  if (from.charging || to.charging || miles <= 0) return null;
  return { miles, kwh: (Math.max(0, from.batteryPercent - to.batteryPercent) / 100) * BATTERY_KWH };
}

export function lastMiles(history: EnergySample[], miles: number): EnergySample[] {
  const latest = history[history.length - 1];
  if (!latest) return [];
  const from = latest.odometerMiles - miles;
  return history.filter((sample) => sample.odometerMiles >= from);
}

export function lastSeconds(history: EnergySample[], seconds: number): EnergySample[] {
  const latest = history[history.length - 1];
  if (!latest) return [];
  return history.filter((sample) => sample.t >= latest.t - seconds * 1000);
}

function totals(samples: EnergySample[]) {
  let miles = 0;
  let kwh = 0;
  samples.slice(1).forEach((sample, index) => {
    const driven = drivenBetween(samples[index], sample);
    if (!driven) return;
    miles += driven.miles;
    kwh += driven.kwh;
  });
  return { miles, kwh };
}

// Measured from the battery. Null until there is enough distance to mean anything.
export function averageWhPerMile(samples: EnergySample[]): number | null {
  const { miles, kwh } = totals(samples);
  return miles >= 0.01 ? (kwh * 1000) / miles : null;
}

export const energyUsedKwh = (samples: EnergySample[]): number => totals(samples).kwh;

// Wh per mile along the window. The speed model gives the shape, then it is scaled so its
// distance-weighted mean is the battery's measured figure.
export function consumptionSeries(
  samples: EnergySample[],
  buckets = CHART_BUCKETS,
): { x: number; y: number }[] {
  const average = averageWhPerMile(samples);
  const latest = samples[samples.length - 1];
  if (average === null || !latest) return [];

  const first = samples[0].odometerMiles;
  const span = latest.odometerMiles - first;
  const sums = Array.from({ length: buckets }, () => ({ load: 0, miles: 0 }));

  samples.slice(1).forEach((sample, index) => {
    const previous = samples[index];
    const driven = drivenBetween(previous, sample);
    if (!driven) return;
    const position = (sample.odometerMiles - first) / span;
    const bucket = sums[Math.min(buckets - 1, Math.floor(position * buckets))];
    bucket.load += relativeLoad(sample.speed, accelerationBetween(previous, sample)) * driven.miles;
    bucket.miles += driven.miles;
  });

  const totalLoad = sums.reduce((sum, bucket) => sum + bucket.load, 0);
  const totalMiles = sums.reduce((sum, bucket) => sum + bucket.miles, 0);
  const scale = average / (totalLoad / totalMiles);

  return sums.flatMap((bucket, index) =>
    bucket.miles > 0
      ? [{ x: ((index + 0.5) / buckets - 1) * span, y: (bucket.load / bucket.miles) * scale }]
      : [],
  );
}

export function usageBreakdown(samples: EnergySample[], cabinTemperature: number): EnergyShare[] {
  let rolling = 0;
  let aero = 0;
  let acceleration = 0;
  samples.slice(1).forEach((sample, index) => {
    const previous = samples[index];
    const driven = drivenBetween(previous, sample);
    if (!driven) return;
    rolling += ROLLING_LOAD * driven.miles;
    aero += aeroLoad(sample.speed) * driven.miles;
    acceleration +=
      Math.max(0, accelerationLoad(accelerationBetween(previous, sample))) * driven.miles;
  });

  const drivingLoad = rolling + aero + acceleration;
  const kwh = energyUsedKwh(samples);
  if (drivingLoad === 0) return [];

  const climate = Math.min(0.3, 0.04 + (Math.abs(cabinTemperature - COMFORTABLE_CABIN) / 20) * 0.2);
  const forDriving = 1 - climate - ACCESSORIES_SHARE;
  const share = (label: string, value: number): EnergyShare => ({
    label,
    share: value,
    kwh: value * kwh,
  });

  return [
    share('Rolling', (rolling / drivingLoad) * forDriving),
    share('Speed', (aero / drivingLoad) * forDriving),
    share('Acceleration', (acceleration / drivingLoad) * forDriving),
    share('Climate', climate),
    share('Accessories', ACCESSORIES_SHARE),
  ];
}

export const predictedRangeMiles = (batteryPercent: number, whPerMile: number): number =>
  ((batteryPercent / 100) * BATTERY_KWH * 1000) / whPerMile;

export function predictTrip(
  batteryPercent: number,
  miles: number,
  whPerMile: number,
): TripPrediction {
  const energyKwh = (miles * whPerMile) / 1000;
  const arrivalPercent = batteryPercent - (energyKwh / BATTERY_KWH) * 100;
  return { energyKwh, arrivalPercent, reachable: arrivalPercent > 0 };
}

export const latestAcceleration = (samples: EnergySample[]): number => {
  const [from, to] = samples.slice(-2);
  return from && to ? accelerationBetween(from, to) : 0;
};

/* -------------------- The history itself -------------------- */

const isSample = (value: unknown): value is EnergySample => {
  const sample = value as EnergySample | null;
  return (
    typeof sample === 'object' &&
    sample !== null &&
    Number.isFinite(sample.t) &&
    Number.isFinite(sample.odometerMiles) &&
    Number.isFinite(sample.batteryPercent) &&
    Number.isFinite(sample.speed) &&
    typeof sample.charging === 'boolean'
  );
};

export function parseHistory(raw: string | null): EnergySample[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isSample).slice(-MAX_SAMPLES) : [];
  } catch {
    return [];
  }
}

let history: EnergySample[] | null = null;
let lastSavedAt = 0;
const listeners = new Set<() => void>();

const readHistory = (): EnergySample[] => {
  history ??= parseHistory(safeStorage.getItem(STORAGE_KEY));
  return history;
};

const publish = (next: EnergySample[]) => {
  history = next;
  listeners.forEach((listener) => listener());
};

export function recordEnergySample(sample: EnergySample) {
  const current = readHistory();
  if (!shouldSample(current[current.length - 1], sample)) return;
  publish(addSample(current, sample));
  if (sample.t - lastSavedAt >= SAVE_EVERY_MS) {
    lastSavedAt = sample.t;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

export function clearEnergyHistory() {
  safeStorage.removeItem(STORAGE_KEY);
  publish([]);
}

// Tests start each case from what is in storage.
export function reloadEnergyHistory() {
  history = null;
  lastSavedAt = 0;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useEnergyHistory = (): EnergySample[] => useSyncExternalStore(subscribe, readHistory);

// Runs for as long as the car does, so a drive is recorded with the Energy app closed.
export function useEnergySampler() {
  const speed = useCar((state) => state.speed);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const odometerMiles = useCar((state) => state.odometerMiles);
  const charging = useCar((state) => state.chargeState === 'charging');

  useEffect(() => {
    recordEnergySample({ t: Date.now(), odometerMiles, batteryPercent, speed, charging });
  }, [speed, batteryPercent, odometerMiles, charging]);
}
