import { BackupCam } from '../BackupCam/BackupCam';
import styles from './Camera.module.css';

// One camera for now: the device's own. More angles can come back once there is something
// real behind them.
export function Camera() {
  return (
    <div className={styles.camera}>
      <div className={styles.feed}>
        <BackupCam />
      </div>
    </div>
  );
}
