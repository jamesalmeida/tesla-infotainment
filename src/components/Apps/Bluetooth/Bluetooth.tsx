import { BluetoothDevices } from './BluetoothDevices';
import styles from './Bluetooth.module.css';

// The app has no Settings sidebar around it, so it brings its own margin and scrolling.
export const Bluetooth = () => (
  <div className={styles.bluetooth}>
    <BluetoothDevices />
  </div>
);
