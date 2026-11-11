import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { navigateToPlace } from '../../../apps/navigation';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { useCarActions } from '../../../state/CarStateContext';
import {
  addDays,
  eventsForDay,
  formatDay,
  formatRange,
  layoutDay,
  loadImportedEvents,
  sampleEvents,
  saveImportedEvents,
  startOfDay,
  type CalendarEvent,
} from './calendarEvents';
import { parseIcs } from './ics';
import styles from './Calendar.module.css';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES_PER_DAY = 24 * 60;
const FIRST_VISIBLE_HOUR = 7;

const hourLabel = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' });

const minutesInto = (time: number, day: number) =>
  Math.min(MINUTES_PER_DAY, Math.max(0, (time - day) / 60000));

const asPercent = (minutes: number) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

function EventDetail({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const actions = useCarActions();

  return (
    <aside className={styles.detail} aria-label="Event details">
      <div className={ui.rowText}>
        <div className={ui.strong}>{event.title}</div>
        <div className={ui.muted}>{formatRange(event)}</div>
        {event.location && <div>{event.location}</div>}
        {event.notes && <div className={ui.muted}>{event.notes}</div>}
      </div>
      <div className={ui.inline}>
        {event.location && (
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            onClick={() => navigateToPlace(event.location as string, actions)}
          >
            Navigate
          </button>
        )}
        <button type="button" className={ui.button} onClick={onClose}>
          Close
        </button>
      </div>
    </aside>
  );
}

export const Calendar = () => {
  const [now] = useState(() => Date.now());
  const today = startOfDay(now);
  const [day, setDay] = useState(today);
  const [imported, setImported] = useState(loadImportedEvents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const events = useMemo(() => [...sampleEvents(now), ...imported], [now, imported]);
  const dayEvents = useMemo(() => eventsForDay(events, day), [events, day]);
  const allDay = dayEvents.filter((event) => event.allDay);
  const placed = useMemo(() => layoutDay(dayEvents.filter((e) => !e.allDay)), [dayEvents]);
  const selected = events.find((event) => event.id === selectedId) ?? null;

  // The morning is a better first view than midnight, and today opens at the current hour.
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const hour = day === today ? new Date(now).getHours() - 1 : FIRST_VISIBLE_HOUR;
    timeline.scrollTop = (timeline.scrollHeight / 24) * Math.max(0, hour);
  }, [day, today, now]);

  const moveTo = (nextDay: number) => {
    setDay(nextDay);
    setSelectedId(null);
  };

  const handleImport = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = '';
    if (!file) return;
    const found = parseIcs(await file.text());
    if (found.length === 0) {
      setImportMessage(`No events found in ${file.name}.`);
      return;
    }
    const ids = new Set(found.map((event) => event.id));
    const merged = [...imported.filter((event) => !ids.has(event.id)), ...found];
    saveImportedEvents(merged);
    setImported(merged);
    setImportMessage(
      `Imported ${found.length} ${found.length === 1 ? 'event' : 'events'} from ${file.name}.`,
    );
    moveTo(startOfDay(found[0].start));
  };

  const clearImports = () => {
    saveImportedEvents([]);
    setImported([]);
    setSelectedId(null);
    setImportMessage('Removed the imported events.');
  };

  return (
    <AppScreen
      title="Calendar"
      fixed
      toolbar={
        <>
          <button
            type="button"
            className={ui.button}
            aria-label="Previous day"
            onClick={() => moveTo(addDays(day, -1))}
          >
            ‹
          </button>
          <span className={styles.date} aria-live="polite">
            {formatDay(day)}
          </span>
          <button
            type="button"
            className={ui.button}
            aria-label="Next day"
            onClick={() => moveTo(addDays(day, 1))}
          >
            ›
          </button>
          <button
            type="button"
            className={ui.button}
            disabled={day === today}
            onClick={() => moveTo(today)}
          >
            Today
          </button>
          <button type="button" className={ui.button} onClick={() => fileRef.current?.click()}>
            Import .ics
          </button>
          {imported.length > 0 && (
            <button type="button" className={ui.button} onClick={clearImports}>
              Clear imports
            </button>
          )}
          <input
            ref={fileRef}
            className={ui.visuallyHidden}
            type="file"
            accept=".ics,text/calendar"
            aria-label="Import a calendar file"
            tabIndex={-1}
            onChange={handleImport}
          />
        </>
      }
    >
      <div className={styles.layout}>
        <div className={styles.main}>
          {importMessage && (
            <Callout
              action={
                <button type="button" className={ui.button} onClick={() => setImportMessage(null)}>
                  Dismiss
                </button>
              }
            >
              {importMessage}
            </Callout>
          )}
          {allDay.length > 0 && (
            <div className={styles.allDay}>
              {allDay.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={styles.allDayEvent}
                  onClick={() => setSelectedId(event.id)}
                >
                  {event.title}
                </button>
              ))}
            </div>
          )}
          <div ref={timelineRef} className={styles.timeline} tabIndex={0} aria-label="Day timeline">
            <div className={styles.hours}>
              {HOURS.map((hour) => (
                <div key={hour} className={styles.hour}>
                  <span>{hourLabel(hour)}</span>
                </div>
              ))}
              <div className={styles.events}>
                {placed.map(({ event, column, columns }) => {
                  const top = minutesInto(event.start, day);
                  const bottom = minutesInto(event.end, day);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`${styles.event} ${event.id === selectedId ? styles.selected : ''}`}
                      style={{
                        top: asPercent(top),
                        height: asPercent(Math.max(30, bottom - top)),
                        left: `${(column / columns) * 100}%`,
                        width: `${100 / columns}%`,
                      }}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <span className={ui.strong}>{event.title}</span>
                      <span className={styles.eventTime}>{formatRange(event)}</span>
                    </button>
                  );
                })}
                {day === today && (
                  <div
                    className={styles.nowLine}
                    style={{ top: asPercent(minutesInto(now, day)) }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>
          {dayEvents.length === 0 && <div className={ui.muted}>Nothing scheduled.</div>}
        </div>
        {selected && <EventDetail event={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </AppScreen>
  );
};
