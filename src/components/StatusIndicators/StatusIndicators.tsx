import { useCar } from '../../state/CarStateContext';
import {
  connectedBluetoothName,
  isHomeLinkInRange,
  isValet,
  wifiIndicator,
} from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import styles from './StatusIndicators.module.css';

// Small icons in the status bar for what the car is connected to right now.
export function StatusIndicators() {
  const wifi = useCar(wifiIndicator);
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
      {(wifi === 'connected' || wifi === 'connecting') && (
        <img
          className={wifi === 'connecting' ? styles.pending : ''}
          src={getImagePath('icon-settings-wifi.svg')}
          alt={wifi === 'connected' ? 'Wifi connected' : 'Wifi connecting'}
        />
      )}
      {hotspot && <span>Hotspot</span>}
    </div>
  );
}
