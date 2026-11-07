import { useCar, useCarActions } from '../../state/CarStateContext';
import { rangeMiles } from '../../state/carState';
import { formatDistance } from '../../utils/units';
import styles from './BatteryStatus.module.css';

const BatteryStatus = () => {
  const batteryPercent = useCar((state) => Math.round(state.batteryPercent));
  const miles = useCar(rangeMiles);
  const isCharging = useCar((state) => state.chargeState === 'charging');
  const preferences = useCar((state) => state.settings.preferences);
  const { setSettings } = useCarActions();
  const range = formatDistance(miles, preferences);
  const showsPercent = preferences.energyDisplay === 'percent';

  return (
    <button
      type="button"
      className={`${styles.batteryStatus} no-select`}
      aria-label={`Battery ${batteryPercent}%, ${range}`}
      onClick={() =>
        setSettings({
          preferences: { ...preferences, energyDisplay: showsPercent ? 'distance' : 'percent' },
        })
      }
    >
      <span>{showsPercent ? `${batteryPercent}%` : range}</span>
      <svg className="icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="2"
          y="6"
          width="20"
          height="12"
          rx="2"
          ry="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="4"
          y="8"
          width={`${(batteryPercent * 16) / 100}`}
          height="8"
          fill={isCharging ? 'var(--color-success)' : 'currentColor'}
          className={styles['battery-fill']}
        />
        <rect x="23" y="10" width="2" height="4" fill="currentColor" />
      </svg>
    </button>
  );
};

export default BatteryStatus;
