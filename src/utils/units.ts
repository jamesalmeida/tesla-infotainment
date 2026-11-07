import type { Preferences } from '../state/carState';

// One place to change when a language setting exists: everything below formats through it.
const LOCALE = 'en-US';

const KM_PER_MILE = 1.609344;
const BAR_PER_PSI = 0.0689476;
const KPA_PER_PSI = 6.89476;

const unitFormat = (unit: string) =>
  new Intl.NumberFormat(LOCALE, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  });

const MILES = unitFormat('mile');
const KILOMETERS = unitFormat('kilometer');
const FAHRENHEIT = unitFormat('fahrenheit');
const CELSIUS = unitFormat('celsius');

const TIME_12H = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h12',
});
const TIME_24H = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const toDistance = (miles: number, { distance }: Pick<Preferences, 'distance'>) =>
  distance === 'km' ? miles * KM_PER_MILE : miles;

export const formatDistance = (miles: number, preferences: Pick<Preferences, 'distance'>) =>
  (preferences.distance === 'km' ? KILOMETERS : MILES).format(toDistance(miles, preferences));

export const speedUnit = ({ distance }: Pick<Preferences, 'distance'>) =>
  distance === 'km' ? 'km/h' : 'mph';

// The car's own numbers are in mph, so speeds convert the same way distances do.
export const formatSpeed = (mph: number, preferences: Pick<Preferences, 'distance'>) =>
  String(Math.round(toDistance(mph, preferences)));

export const toTemperature = (fahrenheit: number, unit: Preferences['temperature']) =>
  unit === 'C' ? ((fahrenheit - 32) * 5) / 9 : fahrenheit;

export const formatTemperature = (fahrenheit: number, unit: Preferences['temperature']) =>
  (unit === 'C' ? CELSIUS : FAHRENHEIT).format(toTemperature(fahrenheit, unit));

export function formatTirePressure(psi: number, unit: Preferences['tirePressure']) {
  if (unit === 'bar') return `${(psi * BAR_PER_PSI).toFixed(1)} bar`;
  if (unit === 'kpa') return `${Math.round(psi * KPA_PER_PSI)} kPa`;
  return `${Math.round(psi)} psi`;
}

export const formatTime = (date: Date, format: Preferences['timeFormat']) =>
  (format === '24h' ? TIME_24H : TIME_12H).format(date);

// A clock time saved as 24-hour HH:MM, shown the way the driver reads time.
export function formatClockTime(time: string, format: Preferences['timeFormat']) {
  const [hours, minutes] = time.split(':').map(Number);
  return formatTime(new Date(2000, 0, 1, hours, minutes), format);
}

export function formatDuration(hours: number) {
  const totalMinutes = Math.max(1, Math.round(hours * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours === 0) return `${minutes} min`;
  return minutes === 0 ? `${wholeHours} hr` : `${wholeHours} hr ${minutes} min`;
}
