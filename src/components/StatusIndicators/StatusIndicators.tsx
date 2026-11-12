import { useCar, useCarActions } from '../../state/CarStateContext';
import {
  canUseHomeLink,
  connectedBluetoothName,
  isHomeLinkInRange,
  isValet,
} from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import styles from './StatusIndicators.module.css';

// Small icons in the map's status bar, just after the Wi-Fi icon, for what the car is
// connected to right now. The Wi-Fi icon itself belongs to the bar.
export function StatusIndicators() {
  const hotspot = useCar((state) => state.wifi.hotspot);
  const bluetooth = useCar(connectedBluetoothName);

  return (
    <div className={styles.indicators}>
      {bluetooth && (
        <img src={getImagePath('icon-settings-bluetooth.svg')} alt={`Connected to ${bluetooth}`} />
      )}
      {hotspot && <span>Hotspot</span>}
    </div>
  );
}

// The HomeLink remote, as on the car: a house, the name it was programmed with, and a button
// that sends it. It shows near home, and not at all once HomeLink is turned off in Settings.
export function HomeLinkStatus() {
  const enabled = useCar((state) => state.settings.homelinkEnabled);
  const inRange = useCar(isHomeLinkInRange);
  const valet = useCar(isValet);
  const name = useCar((state) => state.homelink.name);
  const canUse = useCar((state) => canUseHomeLink(state).allowed);
  const { toggleGarageDoor } = useCarActions();

  if (!enabled || !inRange || valet) return null;

  return (
    <div className={styles.homelink}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 11 12 4l8.5 7M6 9.2V20h12V9.2M9.5 20v-5.5h5V20" />
      </svg>
      <span className={styles.homelinkName}>{name}</span>
      <button
        type="button"
        className={styles.activate}
        data-hit-area="extended"
        aria-label={`Activate HomeLink: ${name}`}
        disabled={!canUse}
        onClick={toggleGarageDoor}
      >
        Activate
      </button>
    </div>
  );
}
