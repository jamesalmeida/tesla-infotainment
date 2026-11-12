import { useState } from 'react';
import { useCar } from '../../../state/CarStateContext';
import { isParked } from '../../../state/carState';
import { allEvents, formatTime, nextDestination, type CalendarEvent } from './calendarEvents';
import styles from './UpcomingDestination.module.css';

// The car suggests where to go next from the calendar, as a row under Navigate. Only in Park,
// where a trip gets set up.
export function useUpcomingDestination(): CalendarEvent | null {
  const [event] = useState(() => nextDestination(allEvents(Date.now()), Date.now()));
  const parked = useCar(isParked);
  return parked ? event : null;
}

export function UpcomingDestination({
  event,
  onPick,
}: {
  event: CalendarEvent;
  onPick: (place: string) => void;
}) {
  const location = event.location ?? '';
  const [name, ...rest] = location.split(',');
  const area = rest.join(',').trim();

  return (
    <button
      type="button"
      className={styles.destination}
      aria-label={`Navigate to ${location}, for ${event.title} at ${formatTime(event.start)}`}
      onClick={() => onPick(location)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
        <path d="M12 6.5v3.5l2.2 1.4" />
      </svg>
      <span className={styles.text}>
        <span className={styles.name}>{name.trim()}</span>
        <span className={styles.detail}>{area ? `${event.title} · ${area}` : event.title}</span>
      </span>
      <span className={styles.time}>{formatTime(event.start)}</span>
    </button>
  );
}
