import { safeStorage } from '../../../utils/safeStorage';

export interface PlannedTrip {
  id: string;
  name: string;
  miles: number;
  // Set while the trip is under way, so progress comes from the odometer.
  startOdometer: number | null;
}

const STORAGE_KEY = 'tesla-energy-trips';

const isTrip = (value: unknown): value is PlannedTrip => {
  const trip = value as PlannedTrip | null;
  return (
    typeof trip === 'object' &&
    trip !== null &&
    typeof trip.id === 'string' &&
    typeof trip.name === 'string' &&
    Number.isFinite(trip.miles) &&
    trip.miles > 0 &&
    (trip.startOdometer === null || Number.isFinite(trip.startOdometer))
  );
};

export function loadTrips(): PlannedTrip[] {
  try {
    const parsed: unknown = JSON.parse(safeStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isTrip) : [];
  } catch {
    return [];
  }
}

export const saveTrips = (trips: PlannedTrip[]) =>
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(trips));

// Null when the form isn't filled in properly.
export function createTrip(name: string, miles: string, id: string): PlannedTrip | null {
  const distance = Number(miles);
  const label = name.trim();
  if (!label || !Number.isFinite(distance) || distance <= 0) return null;
  return { id, name: label, miles: distance, startOdometer: null };
}

// Only one trip runs at a time, so starting one stops any other.
export const startTrip = (trips: PlannedTrip[], id: string, odometer: number): PlannedTrip[] =>
  trips.map((trip) => ({ ...trip, startOdometer: trip.id === id ? odometer : null }));

export const stopTrip = (trips: PlannedTrip[], id: string): PlannedTrip[] =>
  trips.map((trip) => (trip.id === id ? { ...trip, startOdometer: null } : trip));

export function milesRemaining(trip: PlannedTrip, odometer: number): number {
  if (trip.startOdometer === null) return trip.miles;
  return Math.max(0, trip.miles - (odometer - trip.startOdometer));
}
