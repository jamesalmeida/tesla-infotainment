import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import styles from './ScreenClean.module.css';

export const HOLD_TO_EXIT_MS = 3000;

function CleaningScreen() {
  const { exitMode } = useCarActions();
  const [isHolding, setIsHolding] = useState(false);
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => exitRef.current?.focus(), []);

  useEffect(() => {
    if (!isHolding) return;
    const timer = setTimeout(exitMode, HOLD_TO_EXIT_MS);
    return () => clearTimeout(timer);
  }, [isHolding, exitMode]);

  const isHoldKey = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';
  const release = () => setIsHolding(false);

  return (
    <div
      className={styles.screenClean}
      role="dialog"
      aria-modal="true"
      aria-label="Screen Clean Mode"
      onContextMenu={(event) => event.preventDefault()}
    >
      <h2 className={styles.title}>Screen Clean Mode</h2>
      <p>The screen ignores touches while you wipe it.</p>
      <button
        ref={exitRef}
        type="button"
        className={`${styles.exit} ${isHolding ? styles.holding : ''}`}
        onPointerDown={() => setIsHolding(true)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(event) => {
          if (isHoldKey(event) && !event.repeat) setIsHolding(true);
        }}
        onKeyUp={(event) => {
          if (isHoldKey(event)) release();
        }}
        onBlur={release}
      >
        <span className={styles.progress} style={{ animationDuration: `${HOLD_TO_EXIT_MS}ms` }} />
        <span className={styles.exitLabel}>Press and hold to exit</span>
      </button>
    </div>
  );
}

// Covers everything, the bottom bar included, so a cloth can't reach any control. The only
// way out is holding the one button down, which a wipe across the glass won't do.
export function ScreenClean() {
  const isOn = useCar((state) => state.overlayMode === 'screen-clean');
  return isOn ? <CleaningScreen /> : null;
}
