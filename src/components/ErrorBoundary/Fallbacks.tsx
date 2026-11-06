import styles from './Fallbacks.module.css';

export function DisplayCrashed() {
  return (
    <div className={styles.displayCrashed} role="alert">
      <h1>The display stopped responding</h1>
      <p>Your car is fine. The touchscreen needs a restart.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Restart display
      </button>
    </div>
  );
}

export function AppFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.appFailed} role="alert">
      <p>Couldn't load this app.</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

// A plain top-down outline, for when the 3D car can't render.
export function CarUnavailable() {
  return (
    <div className={styles.carUnavailable}>
      <svg viewBox="0 0 120 240" role="img" aria-label="Car, seen from above">
        <rect x="20" y="10" width="80" height="220" rx="36" />
        <rect x="32" y="62" width="56" height="34" rx="10" />
        <rect x="34" y="160" width="52" height="26" rx="10" />
        <path d="M32 112h56M32 134h56" />
      </svg>
      <p>3D view unavailable</p>
    </div>
  );
}
