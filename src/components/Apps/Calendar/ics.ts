import type { CalendarEvent } from './calendarEvents';

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Property {
  params: string;
  value: string;
}

// Long lines continue on the next line after a space or tab.
const unfold = (text: string): string[] => text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

const unescapeText = (value: string): string =>
  value.replace(/\\([nN,;\\])/g, (_, char: string) => (char.toLowerCase() === 'n' ? '\n' : char));

function parseProperty(line: string): [string, Property] | null {
  const colon = line.indexOf(':');
  if (colon < 1) return null;
  const head = line.slice(0, colon);
  const semicolon = head.indexOf(';');
  const name = (semicolon < 0 ? head : head.slice(0, semicolon)).toUpperCase();
  return [
    name,
    { params: semicolon < 0 ? '' : head.slice(semicolon + 1), value: line.slice(colon + 1) },
  ];
}

// A time with a TZID is read as local time: resolving zones needs tables this app doesn't ship.
function parseDate({ params, value }: Property): { time: number; allDay: boolean } | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds, utc] = match;
  const allDay = hours === undefined || /VALUE=DATE(;|$)/i.test(params);
  const parts = [+year, +month - 1, +day, +(hours ?? 0), +(minutes ?? 0), +(seconds ?? 0)] as const;
  const time = utc ? Date.UTC(...parts) : new Date(...parts).getTime();
  return Number.isNaN(time) ? null : { time, allDay };
}

function parseDuration(value: string): number | null {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match) return null;
  const [, weeks, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0));
  return (
    (weeks * 7 + days) * DAY_MS + hours * 3600 * 1000 + minutes * 60 * 1000 + seconds * 1000 || null
  );
}

function toEvent(properties: Map<string, Property>, index: number): CalendarEvent | null {
  const startProperty = properties.get('DTSTART');
  const start = startProperty && parseDate(startProperty);
  if (!start) return null;

  const endProperty = properties.get('DTEND');
  const durationProperty = properties.get('DURATION');
  const fallback = start.allDay ? DAY_MS : DEFAULT_DURATION_MS;
  const end =
    (endProperty && parseDate(endProperty)?.time) ??
    start.time + ((durationProperty && parseDuration(durationProperty.value)) || fallback);

  const text = (name: string) => {
    const value = properties.get(name)?.value;
    return value ? unescapeText(value).trim() : undefined;
  };

  return {
    id: `import-${text('UID') ?? index}-${start.time}`,
    title: text('SUMMARY') ?? 'Untitled event',
    start: start.time,
    end: Math.max(end, start.time),
    allDay: start.allDay,
    location: text('LOCATION'),
    notes: text('DESCRIPTION'),
    imported: true,
  };
}

// Reads the events in an .ics file. Each one is read as a single occurrence: RRULE is ignored.
// Anything malformed is skipped, so one bad entry can't lose the rest of the file.
export function parseIcs(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  let current: Map<string, Property> | null = null;

  unfold(text).forEach((line) => {
    const trimmed = line.trim().toUpperCase();
    if (trimmed === 'BEGIN:VEVENT') {
      current = new Map();
    } else if (trimmed === 'END:VEVENT') {
      const event = current && toEvent(current, events.length);
      if (event) events.push(event);
      current = null;
    } else if (current) {
      const property = parseProperty(line);
      // The first wins, so a nested VALARM's DESCRIPTION can't replace the event's.
      if (property && !current.has(property[0])) current.set(...property);
    }
  });

  return events;
}
