import { safeStorage } from '../../../utils/safeStorage';

export interface CalendarEvent {
  id: string;
  title: string;
  // Milliseconds since the epoch.
  start: number;
  end: number;
  allDay: boolean;
  location?: string;
  notes?: string;
  imported?: boolean;
}

export interface PlacedEvent {
  event: CalendarEvent;
  // Overlapping events share the width: this one sits in `column` of `columns`.
  column: number;
  columns: number;
}

const STORAGE_KEY = 'tesla-calendar-imports';
const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (time: number): number => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Calendar days, not 24 hour steps, so a clock change can't skip one.
export const addDays = (time: number, days: number): number => {
  const date = new Date(time);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

const at = (day: number, hours: number, minutes = 0): number => {
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

// Built around today so the demo always has something to show. Places are public landmarks,
// so tapping Navigate gives the map search something real to find.
export function sampleEvents(now: number): CalendarEvent[] {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const event = (
    id: string,
    title: string,
    day: number,
    from: [number, number],
    to: [number, number],
    location?: string,
    notes?: string,
  ): CalendarEvent => ({
    id: `sample-${id}`,
    title,
    start: at(day, ...from),
    end: at(day, ...to),
    allDay: false,
    location,
    notes,
  });

  return [
    {
      id: 'sample-holiday',
      title: 'Road trip week',
      start: today,
      end: tomorrow,
      allDay: true,
    },
    event('standup', 'Team check-in', today, [9, 0], [9, 30], undefined, 'Call in from the car.'),
    event(
      'coffee',
      'Coffee with a friend',
      today,
      [9, 15],
      [10, 0],
      'Ferry Building, San Francisco',
    ),
    event('lunch', 'Lunch', today, [12, 30], [13, 30], 'Pier 39, San Francisco'),
    event('service', 'Tyre rotation', today, [15, 0], [16, 0], 'Golden Gate Park, San Francisco'),
    event('dinner', 'Family dinner', today, [18, 30], [20, 0], 'Oracle Park, San Francisco'),
    event('hike', 'Morning hike', tomorrow, [8, 0], [10, 30], 'Muir Woods National Monument'),
    event(
      'library',
      'Return library books',
      tomorrow,
      [14, 0],
      [14, 30],
      'Berkeley Public Library',
    ),
  ];
}

const overlapsDay = (event: CalendarEvent, day: number): boolean =>
  event.start < addDays(day, 1) && event.end > day;

export function eventsForDay(events: CalendarEvent[], day: number): CalendarEvent[] {
  return events
    .filter((event) => overlapsDay(event, day))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

// The next timed event that hasn't started, within the coming day.
export function nextUpcoming(events: CalendarEvent[], now: number): CalendarEvent | null {
  const soonest = events
    .filter((event) => !event.allDay && event.start >= now && event.start - now <= DAY_MS)
    .sort((a, b) => a.start - b.start);
  return soonest[0] ?? null;
}

// The next event worth driving to: the soonest upcoming one with a place.
export function nextDestination(events: CalendarEvent[], now: number): CalendarEvent | null {
  return nextUpcoming(
    events.filter((event) => event.location?.trim()),
    now,
  );
}

// Groups events that overlap, then gives each the first free column in its group.
export function layoutDay(events: CalendarEvent[]): PlacedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedEvent[] = [];
  let group: PlacedEvent[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    const columns = Math.max(...group.map((item) => item.column), 0) + 1;
    group.forEach((item) => placed.push({ ...item, columns }));
    group = [];
  };

  sorted.forEach((event) => {
    if (event.start >= groupEnd) {
      closeGroup();
      groupEnd = -Infinity;
    }
    const taken = new Set(
      group.filter((item) => item.event.end > event.start).map((item) => item.column),
    );
    let column = 0;
    while (taken.has(column)) column += 1;
    group.push({ event, column, columns: 1 });
    groupEnd = Math.max(groupEnd, event.end);
  });
  closeGroup();

  return placed;
}

export const formatTime = (time: number): string =>
  new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const formatDay = (day: number): string =>
  new Date(day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export const formatRange = ({ start, end, allDay }: CalendarEvent): string =>
  allDay ? 'All day' : `${formatTime(start)} – ${formatTime(end)}`;

const isStoredEvent = (value: unknown): value is CalendarEvent => {
  const event = value as CalendarEvent | null;
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    Number.isFinite(event.start) &&
    Number.isFinite(event.end) &&
    typeof event.allDay === 'boolean'
  );
};

export function loadImportedEvents(): CalendarEvent[] {
  try {
    const parsed: unknown = JSON.parse(safeStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isStoredEvent) : [];
  } catch {
    return [];
  }
}

export function saveImportedEvents(events: CalendarEvent[]) {
  if (events.length === 0) safeStorage.removeItem(STORAGE_KEY);
  else safeStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export const allEvents = (now: number): CalendarEvent[] => [
  ...sampleEvents(now),
  ...loadImportedEvents(),
];
