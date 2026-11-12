import { useCar } from '../../state/CarStateContext';
import { connectedBluetoothName, isHomeLinkInRange, isValet } from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import styles from './StatusIndicators.module.css';

// Small icons in the map's status bar, just after the Wi-Fi icon, for what the car is
// connected to right now. The Wi-Fi icon itself belongs to the bar.
export function StatusIndicators() {
  const hotspot = useCar((state) => state.wifi.hotspot);
  const bluetooth = useCar(connectedBluetoothName);
  const inRange = useCar(isHomeLinkInRange);
  const valet = useCar(isValet);

  return (
    <div className={styles.indicators}>
      {inRange && !valet && (
        <img src={getImagePath('icon-settings-homelink.svg')} alt="HomeLink in range" />
      )}
      {bluetooth && (
        <img src={getImagePath('icon-settings-bluetooth.svg')} alt={`Connected to ${bluetooth}`} />
      )}
      {hotspot && <span>Hotspot</span>}
    </div>
  );
}
