import { useCar, useCarActions } from '../../state/CarStateContext';
import { sentryState } from '../../state/carState';
import styles from './SentryOverlay.module.css';

// The red frame and watching eye. Standby only shows in the status icons, as an alarm must
// stand out from it. The rest of the screen stays usable underneath.
export function SentryOverlay() {
  const isAlarm = useCar((state) => sentryState(state) === 'alarm');
  const { clearSentryAlarm } = useCarActions();

  if (!isAlarm) return null;

  return (
    <div className={styles.sentryOverlay} role="alert">
      <div className={styles.banner}>
        <svg className={styles.eye} viewBox="0 0 48 24" aria-hidden="true">
          <path d="M2 12S11 2 24 2s22 10 22 10-9 10-22 10S2 12 2 12z" />
          <circle className={styles.pupil} cx="24" cy="12" r="6" />
        </svg>
        <span>Sentry Mode alarm</span>
        <button type="button" className={styles.dismiss} onClick={clearSentryAlarm}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
