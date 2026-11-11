import { useCar, useCarActions } from '../../state/CarStateContext';
import { canEngageAutopilot } from '../../state/carState';
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
