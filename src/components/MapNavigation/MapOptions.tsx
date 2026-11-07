import type { LiveLocation } from './mapLayers';
import styles from './MapNavigation.module.css';

interface MapOptionsProps {
  liveLocation: LiveLocation;
  onToggleLiveLocation: () => void;
}

/** The map settings popover. */
export function MapOptions({ liveLocation, onToggleLiveLocation }: MapOptionsProps) {
  return (
    <div className={styles.mapOptions} role="group" aria-label="Map settings">
      <button
        className={styles.mapOption}
        role="switch"
        aria-checked={liveLocation !== 'off'}
        onClick={onToggleLiveLocation}
      >
        Use this device's location
      </button>
    </div>
  );
}
