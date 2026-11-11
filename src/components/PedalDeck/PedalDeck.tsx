import { useCar, useCarActions } from '../../state/CarStateContext';
import type { Pedal } from '../../state/carState';
import styles from './PedalDeck.module.css';

interface PedalProps {
  pedal: Exclude<Pedal, 'none'>;
  label: string;
  hint: string;
}

// Held like a real pedal: down while pressed, up the moment the pointer lets go or leaves.
export function PedalButton({
  pedal,
  label,
  hint,
  className,
}: PedalProps & { className?: string }) {
  const isDown = useCar((state) => state.pedal === pedal);
  const { setPedal } = useCarActions();
  const release = () => setPedal('none');

  return (
    <button
      type="button"
      className={className}
      aria-label={`${label} (hold, or hold ${hint})`}
      aria-pressed={isDown}
      data-pedal={pedal}
      onPointerDown={() => setPedal(pedal)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      <span className={styles.label}>{label}</span>
    </button>
  );
}

// The pedals sit under the screen, where the driver's feet are, rather than on it. Pressing
// the brake is also what brings up the drive strip, as it does in the car.
export function PedalDeck() {
  return (
    <div className={styles.pedalDeck}>
      <PedalButton className={styles.brake} pedal="brake" label="Brake" hint="↓" />
      <PedalButton className={styles.accelerator} pedal="accelerate" label="Accelerator" hint="↑" />
      <p className={styles.hint}>Press the brake to show the drive strip, then swipe to shift.</p>
    </div>
  );
}
