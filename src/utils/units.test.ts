import {
  formatClockTime,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTemperature,
  formatTime,
  formatTirePressure,
  speedUnit,
} from './units';

// Intl puts a narrow no-break space before AM and PM.
const plain = (text: string) => text.replace(/\s/g, ' ');

test.each([
  [214, 'mi', '214 mi'],
  [214, 'km', '344 km'],
] as const)('%s miles in %s', (miles, distance, expected) => {
  expect(formatDistance(miles, { distance })).toBe(expected);
});

test.each([
  [60, 'mi', '60', 'mph'],
  [60, 'km', '97', 'km/h'],
] as const)('%s mph in %s', (mph, distance, value, unit) => {
  expect(formatSpeed(mph, { distance })).toBe(value);
  expect(speedUnit({ distance })).toBe(unit);
});

test.each([
  [72, 'F', '72°F'],
  [72, 'C', '22°C'],
] as const)('%s°F in %s', (fahrenheit, unit, expected) => {
  expect(formatTemperature(fahrenheit, unit)).toBe(expected);
});

test.each([
  ['psi', '42 psi'],
  ['bar', '2.9 bar'],
  ['kpa', '290 kPa'],
] as const)('tire pressure in %s', (unit, expected) => {
  expect(formatTirePressure(42, unit)).toBe(expected);
});

test.each([
  [new Date(2026, 0, 1, 15, 5), '12h', '3:05 PM'],
  [new Date(2026, 0, 1, 15, 5), '24h', '15:05'],
  [new Date(2026, 0, 1, 0, 5), '12h', '12:05 AM'],
  [new Date(2026, 0, 1, 0, 5), '24h', '00:05'],
] as const)('%s as %s', (date, format, expected) => {
  expect(plain(formatTime(date, format))).toBe(expected);
});

test('saved schedule times read in the chosen format', () => {
  expect(plain(formatClockTime('23:00', '12h'))).toBe('11:00 PM');
  expect(formatClockTime('23:00', '24h')).toBe('23:00');
});

test.each([
  [0.001, '1 min'],
  [0.5, '30 min'],
  [1, '1 hr'],
  [1.75, '1 hr 45 min'],
])('%s hours reads as %s', (hours, expected) => {
  expect(formatDuration(hours)).toBe(expected);
});
