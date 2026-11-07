import { useCallback, useEffect, useRef, useState } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { isParked } from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import { formatTime } from '../../utils/units';
import LoadingScreen from '../LoadingScreen/LoadingScreen';
import styles from './SleepOverlay.module.css';

// Long enough that a demo never sleeps while someone is reading the screen.
export const SLEEP_AFTER_MS = 3 * 60 * 1000;
export const RESTART_HOLD_MS = 2000;
export const WAKE_MS = 1200;

export function SleepOverlay() {
  const parked = useCar(isParked);
  const chargeState = useCar((state) => state.chargeState);
  const busy = useCar(
    (state) =>
      state.overlayMode !== null || state.activeModal !== null || state.restartSecondsLeft > 0,
  );
  const timeFormat = useCar((state) => state.settings.preferences.timeFormat);
  const { restartDisplay } = useCarActions();
  const [sleeping, setSleeping] = useState(false);
  const [waking, setWaking] = useState(false);
  const [now, setNow] = useState(new Date());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const didHold = useRef(false);

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(wakeTimer.current);
    clearTimeout(holdTimer.current);
  }, []);

  const wake = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(wakeTimer.current);
    setSleeping(false);
    setWaking(true);
    wakeTimer.current = setTimeout(() => setWaking(false), WAKE_MS);
  }, []);

  // Only a parked car sleeps. Charging and driving keep the screen on.
  useEffect(() => {
    if (!parked || chargeState !== 'unplugged' || busy) {
      setSleeping(false);
      clearTimeout(idleTimer.current);
      return;
    }

    const arm = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setSleeping(true), SLEEP_AFTER_MS);
    };

    const handleActivity = () => {
      if (sleeping) wake();
      else arm();
    };

    arm();
    const events: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [parked, chargeState, busy, sleeping, wake]);

  useEffect(() => {
    if (!sleeping) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [sleeping]);

  useEffect(() => () => clearTimers(), []);

  const startHold = () => {
    didHold.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      restartDisplay();
      setSleeping(false);
    }, RESTART_HOLD_MS);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    if (!didHold.current) wake();
  };

  if (waking) return <LoadingScreen variant="wake" />;
  if (!sleeping) return null;

  return (
    <div className={styles.sleep} role="presentation" onClick={wake}>
      <div className={styles.inside}>
        <button
          type="button"
          className={styles.logoButton}
          aria-label="Tesla logo. Touch to wake, or hold to restart."
          onPointerDown={(event) => {
            event.stopPropagation();
            startHold();
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            endHold();
          }}
          onPointerCancel={(event) => {
            event.stopPropagation();
            endHold();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <img src={getImagePath('logo-grey.svg')} alt="" />
        </button>
        <p className={styles.time}>{formatTime(now, timeFormat)}</p>
        <p className={styles.hint}>Touch anywhere to wake. Hold the logo to restart.</p>
      </div>
    </div>
  );
}
