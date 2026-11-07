import type { SeatHeat } from '../../state/carState';
import styles from './Climate.module.css';

const LEVELS = [1, 2, 3];

// The level on a seat icon: red bars for heat, blue for cooling, an A for Auto.
export function SeatLevel({ heat }: { heat: SeatHeat }) {
  if (heat === 'auto') {
    return (
      <span className={styles.seatAuto} aria-hidden="true">
        A
      </span>
    );
  }
  return (
    <span className={styles.seatLevel} data-kind={heat < 0 ? 'cool' : 'heat'} aria-hidden="true">
      {LEVELS.map((level) => (
        <span key={level} className={Math.abs(heat) >= level ? styles.lit : undefined} />
      ))}
    </span>
  );
}
