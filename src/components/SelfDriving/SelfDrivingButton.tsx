import { useCar, useCarActions } from '../../state/CarStateContext';
import {
  canEngageAutopilot,
  DRIVING_PROFILE_LABELS,
  DRIVING_PROFILES,
  type DrivingProfile,
} from '../../state/carState';
import styles from './SelfDrivingButton.module.css';

// The pale blue button at the top of the car panel. It is always shown, as in the car: in Park
// it reads as unavailable and says why when pressed, and in Drive it starts the simulated
// self-driving, which this app's Autopilot settings make clear is not the real thing.
export function SelfDrivingButton() {
  const isEngaged = useCar((state) => state.autopilot === 'autosteer');
  const canStart = useCar((state) => canEngageAutopilot(state, 'autosteer').allowed);
  const reason = useCar((state) => {
    const permission = canEngageAutopilot(state, 'autosteer');
    return permission.allowed ? null : permission.reason;
  });
  const { engageAutopilot, disengageAutopilot, showNotice } = useCarActions();

  const handlePress = () => {
    if (isEngaged) disengageAutopilot();
    else if (reason) showNotice(reason);
    else engageAutopilot('autosteer');
  };

  const state = isEngaged ? 'engaged' : canStart ? 'ready' : 'unavailable';

  return (
    <button
      type="button"
      className={`${styles.selfDriving} ${styles[state]}`}
      aria-pressed={isEngaged}
      onClick={handlePress}
    >
      {isEngaged ? 'Stop Self-Driving' : 'Start Self-Driving'}
    </button>
  );
}

// In Drive, the column under the speed: "Self-Driving", blue while it drives, and the mode
// under it. A tap on the name starts or stops it; the mode can change at any time.
export function SelfDrivingStatus() {
  const isEngaged = useCar((state) => state.autopilot === 'autosteer');
  const canStart = useCar((state) => canEngageAutopilot(state, 'autosteer').allowed);
  const reason = useCar((state) => {
    const permission = canEngageAutopilot(state, 'autosteer');
    return permission.allowed ? null : permission.reason;
  });
  const profile = useCar((state) => state.settings.drivingProfile);
  const { engageAutopilot, disengageAutopilot, showNotice, setSettings } = useCarActions();

  const handlePress = () => {
    if (isEngaged) disengageAutopilot();
    else if (reason) showNotice(reason);
    else engageAutopilot('autosteer');
  };

  const state = isEngaged ? 'engaged' : canStart ? 'ready' : 'unavailable';

  return (
    <div className={styles.status}>
      <button
        type="button"
        className={`${styles.statusButton} ${styles[state]}`}
        aria-pressed={isEngaged}
        onClick={handlePress}
      >
        {isEngaged ? 'Stop Self-Driving' : 'Start Self-Driving'}
      </button>
      <label className={styles.mode}>
        <span className={styles.visuallyHidden}>Self-Driving mode</span>
        <select
          value={profile}
          onChange={(event) =>
            setSettings({ drivingProfile: event.target.value as DrivingProfile })
          }
        >
          {DRIVING_PROFILES.map((value) => (
            <option key={value} value={value}>
              {DRIVING_PROFILE_LABELS[value]}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </label>
    </div>
  );
}
