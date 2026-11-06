import { useCar, useCarActions } from '../../state/CarStateContext';
import type { Gear } from '../../state/carState';
import styles from './GearSelect.module.css';

const GEARS: Gear[] = ['P', 'R', 'N', 'D'];

function GearSelect() {
  const activeGear = useCar((state) => state.gear);
  const { selectGear } = useCarActions();

  return (
    <div className={`${styles.gearSelect} no-select`}>
      {GEARS.map((gear) => (
        <button
          key={gear}
          type="button"
          className={`${styles.gearSelectIcon} ${activeGear === gear ? styles.active : ''}`}
          aria-pressed={activeGear === gear}
          onClick={() => selectGear(gear)}
        >
          {gear}
        </button>
      ))}
    </div>
  );
}

export default GearSelect;
