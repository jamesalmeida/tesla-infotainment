import { useState } from 'react';
import { navigateToPlace } from '../../../apps/navigation';
import { ui } from '../../../apps/ui/AppScreen';
import { useCar, useCarActions } from '../../../state/CarStateContext';
import { isParked } from '../../../state/carState';
import { allEvents, formatRange, nextUpcoming } from './calendarEvents';
import styles from './UpcomingCard.module.css';

// The card the real car shows when you get in. It stays until dismissed or the car leaves Park.
export function UpcomingCard() {
  const [event] = useState(() => nextUpcoming(allEvents(Date.now()), Date.now()));
  const [dismissed, setDismissed] = useState(false);
  const parked = useCar(isParked);
  const actions = useCarActions();

  if (!event || dismissed || !parked) return null;

  return (
    <aside className={styles.card} aria-label="Upcoming event">
      <div className={styles.text}>
        <div className={styles.label}>Upcoming</div>
        <div className={styles.title}>{event.title}</div>
        <div className={styles.meta}>
          {formatRange(event)}
          {event.location ? ` · ${event.location}` : ''}
        </div>
      </div>
      <div className={styles.actions}>
        {event.location && (
          <button
            type="button"
            className={`${styles.action} ${styles.primary}`}
            onClick={() => {
              setDismissed(true);
              navigateToPlace(event.location as string, actions);
            }}
          >
            Navigate
          </button>
        )}
        <button
          type="button"
          className={styles.action}
          aria-label="Dismiss upcoming event"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
      <span className={ui.visuallyHidden} role="status">
        Upcoming: {event.title}
      </span>
    </aside>
  );
}
