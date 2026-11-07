import { useCar } from '../../state/CarStateContext';
import { chargeHoursRemaining, type ChargeState } from '../../state/carState';
import { getTouchscreenPath } from '../../utils/assetPaths';
import { formatDuration } from '../../utils/units';
import styles from './ChargeStatus.module.css';

const STATE_LABELS: Record<Exclude<ChargeState, 'unplugged'>, string> = {
  charging: 'Charging',
  scheduled: 'Charging scheduled',
  stopped: 'Charging stopped',
  complete: 'Charging complete',
};

// Sits with the car while a cable is in, so the session reads without opening Settings.
export function ChargeStatus() {
  const chargeState = useCar((state) => state.chargeState);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const limit = useCar((state) => state.settings.chargeLimit);
  const hoursRemaining = useCar(chargeHoursRemaining);

  if (chargeState === 'unplugged') return null;
  const isCharging = chargeState === 'charging';

  return (
    <div className={styles.chargeStatus} role="status">
      <span
        className={`${styles.bolt} ${isCharging ? styles.pulsing : ''}`}
        style={{ maskImage: `url(${getTouchscreenPath('car_status/thunder.png')})` }}
      />
      <div className={styles.details}>
        <div className={styles.summary}>
          <span>{STATE_LABELS[chargeState]}</span>
          {isCharging && hoursRemaining !== null && (
            <span>{formatDuration(hoursRemaining)} remaining</span>
          )}
        </div>
        <div className={styles.meter}>
          <div
            className={`${styles.fill} ${isCharging ? styles.flowing : ''}`}
            style={{ width: `${batteryPercent}%` }}
          />
          <div className={styles.limit} style={{ left: `${limit}%` }} />
        </div>
      </div>
    </div>
  );
}
