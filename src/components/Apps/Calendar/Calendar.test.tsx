import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import { Calendar } from './Calendar';
import {
  addDays,
  eventsForDay,
  layoutDay,
  loadImportedEvents,
  nextUpcoming,
  sampleEvents,
  saveImportedEvents,
  startOfDay,
  type CalendarEvent,
} from './calendarEvents';
import { parseIcs } from './ics';
import { UpcomingCard } from './UpcomingCard';

const NOON = new Date(2026, 10, 6, 12, 0).getTime();

const event = (id: string, startHour: number, endHour: number): CalendarEvent => ({
  id,
  title: id,
  start: new Date(2026, 10, 6, startHour).getTime(),
  end: new Date(2026, 10, 6, endHour).getTime(),
  allDay: false,
});

const renderInCar = (
  ui: React.ReactNode,
  gear: 'P' | 'D' = 'P',
  surface = initialCarState.surface,
) =>
  render(
    <CarStateProvider initialState={{ ...initialCarState, gear, surface }}>{ui}</CarStateProvider>,
  );

beforeEach(() => localStorage.clear());

describe('ics parsing', () => {
  test('reads times, zones, all-day events and escapes', () => {
    const events = parseIcs(
      [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:one',
        'SUMMARY:Dentist\\, then lunch',
        'DTSTART:20261106T170000Z',
        'DTEND:20261106T180000Z',
        'LOCATION:12 Main St\\nSuite 4',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'SUMMARY:Holiday',
        'DTSTART;VALUE=DATE:20261225',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'SUMMARY:Local',
        'DTSTART;TZID=America/Los_Angeles:20261107T090000',
        'DURATION:PT30M',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    );

    expect(events).toHaveLength(3);
    expect(events[0].title).toBe('Dentist, then lunch');
    expect(events[0].start).toBe(Date.UTC(2026, 10, 6, 17));
    expect(events[0].location).toBe('12 Main St\nSuite 4');
    expect(events[1].allDay).toBe(true);
    expect(events[1].end - events[1].start).toBe(24 * 3600 * 1000);
    expect(events[2].start).toBe(new Date(2026, 10, 7, 9).getTime());
    expect(events[2].end - events[2].start).toBe(30 * 60 * 1000);
  });

  test('joins folded lines and skips an event with no valid start', () => {
    const events = parseIcs(
      [
        'BEGIN:VEVENT',
        'SUMMARY:A very long',
        '  title',
        'DTSTART:20261106T090000',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'SUMMARY:Broken',
        'DTSTART:tomorrow',
        'END:VEVENT',
      ].join('\n'),
    );

    expect(events.map((item) => item.title)).toEqual(['A very long title']);
  });

  test('an alarm inside an event does not replace its description', () => {
    const [parsed] = parseIcs(
      [
        'BEGIN:VEVENT',
        'DTSTART:20261106T090000',
        'DESCRIPTION:The real notes',
        'BEGIN:VALARM',
        'DESCRIPTION:Reminder',
        'END:VALARM',
        'END:VEVENT',
      ].join('\n'),
    );
    expect(parsed.notes).toBe('The real notes');
  });
});

describe('day logic', () => {
  test('overlapping events share columns and later ones get the full width', () => {
    const placed = layoutDay([event('a', 9, 11), event('b', 10, 12), event('c', 13, 14)]);
    const byId = Object.fromEntries(placed.map((item) => [item.event.id, item]));

    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ column: 0, columns: 1 });
  });

  test('a day only lists what touches it', () => {
    const day = startOfDay(NOON);
    const tomorrow = { ...event('t', 9, 10), start: addDays(day, 1), end: addDays(day, 1) + 1000 };
    expect(eventsForDay([event('a', 9, 10), tomorrow], day).map((item) => item.id)).toEqual(['a']);
  });

  test('the next event ignores anything past, all-day or more than a day away', () => {
    const later = { ...event('far', 9, 10), start: NOON + 2 * 86400000 };
    const allDay = { ...event('all', 13, 14), allDay: true };
    expect(nextUpcoming([event('past', 9, 10), later, allDay], NOON)).toBeNull();
    expect(nextUpcoming([event('soon', 15, 16), event('sooner', 13, 14)], NOON)?.id).toBe('sooner');
  });

  test('sample events always include something later today or tomorrow', () => {
    const lateNight = new Date(2026, 10, 6, 23, 30).getTime();
    expect(nextUpcoming(sampleEvents(lateNight), lateNight)).not.toBeNull();
  });

  test('imports outlive the app and corrupt storage is ignored', () => {
    saveImportedEvents([event('kept', 9, 10)]);
    expect(loadImportedEvents().map((item) => item.id)).toEqual(['kept']);
    localStorage.setItem('tesla-calendar-imports', '{not json');
    expect(loadImportedEvents()).toEqual([]);
  });
});

describe('screens', () => {
  test('the day view opens an event and offers navigation', () => {
    renderInCar(<Calendar />);
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Lunch/ }));

    expect(screen.getByRole('complementary', { name: 'Event details' })).toHaveTextContent(
      'Pier 39',
    );
    expect(screen.getByRole('button', { name: 'Navigate' })).toBeInTheDocument();
  });

  test('importing a file jumps to its first event and reports the count', async () => {
    renderInCar(<Calendar />);
    const file = new File(
      ['BEGIN:VEVENT\nSUMMARY:Imported thing\nDTSTART:20300102T090000\nEND:VEVENT'],
      'mine.ics',
    );

    fireEvent.change(screen.getByLabelText('Import a calendar file'), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/Imported 1 event from mine.ics/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Imported thing/ })).toBeInTheDocument();
    await waitFor(() => expect(loadImportedEvents()).toHaveLength(1));
  });

  test('a file with no events says so', async () => {
    renderInCar(<Calendar />);
    fireEvent.change(screen.getByLabelText('Import a calendar file'), {
      target: { files: [new File(['nothing here'], 'empty.ics')] },
    });
    expect(await screen.findByText('No events found in empty.ics.')).toBeInTheDocument();
  });

  test('the upcoming card shows in Park, dismisses, and stays away while driving', () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 6, 8, 0) });
    const parked = renderInCar(<UpcomingCard />);
    expect(screen.getByRole('complementary', { name: 'Upcoming event' })).toHaveTextContent(
      'Team check-in',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss upcoming event' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    parked.unmount();

    const driving = renderInCar(<UpcomingCard />, 'D');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    driving.unmount();

    // It must not sit on top of an open app.
    renderInCar(<UpcomingCard />, 'P', { kind: 'app', app: 'energy' });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
