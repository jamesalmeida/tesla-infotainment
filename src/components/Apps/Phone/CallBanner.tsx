import { useEffect, useState } from 'react';
import {
  answerCall,
  declineCall,
  formatCallTime,
  hangUp,
  useCallSession,
} from '../../../apps/callSession';
import styles from './CallBanner.module.css';

export function useCallSeconds(since: number | null): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (since === null) return;
    const update = () => setSeconds(Math.max(0, (Date.now() - since) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [since]);

  return since === null ? 0 : seconds;
}

// Shows over everything, like the real thing, so it keeps working with the Phone app closed.
export function CallBanner() {
  const { call } = useCallSession();
  const seconds = useCallSeconds(call.status === 'active' ? call.since : null);

  if (call.status === 'idle') return null;

  return (
    <aside className={styles.banner} aria-label="Simulated call" role="alert">
      <div className={styles.text}>
        <div className={styles.name}>{call.caller.name}</div>
        <div className={styles.status}>
          {call.status === 'ringing'
            ? 'Simulated incoming call'
            : `Simulated call · ${formatCallTime(seconds)}`}
        </div>
      </div>
      {call.status === 'ringing' ? (
        <>
          <button
            type="button"
            className={`${styles.action} ${styles.answer}`}
            onClick={answerCall}
          >
            Answer
          </button>
          <button type="button" className={`${styles.action} ${styles.end}`} onClick={declineCall}>
            Decline
          </button>
        </>
      ) : (
        <button type="button" className={`${styles.action} ${styles.end}`} onClick={hangUp}>
          End
        </button>
      )}
    </aside>
  );
}
