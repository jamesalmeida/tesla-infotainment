import { useCar, useCarActions } from '../../state/CarStateContext';
import styles from './DogModeDisplay.module.css';

// Fills the whole display, dock included, because it is written for people outside the car.
export function DogModeDisplay() {
  const isActive = useCar((state) => state.climate.mode === 'dog');
  const temperature = useCar((state) => state.climate.driverTemp);
  const { toggleClimateMode } = useCarActions();

  if (!isActive) return null;

  return (
    <div className={styles.display} role="dialog" aria-modal="true" aria-label="Dog Mode">
      <p className={styles.temperature}>{temperature}°</p>
      <p className={styles.message}>Thanks for checking on me. I'm comfortable in here.</p>
      <p className={styles.detail}>The air is running and my person will be back soon.</p>
      <button
        type="button"
        className={styles.exit}
        // Otherwise keyboard focus stays on a control hidden behind this display.
        autoFocus
        onClick={() => toggleClimateMode('dog')}
      >
        Exit Dog Mode
      </button>
    </div>
  );
}
