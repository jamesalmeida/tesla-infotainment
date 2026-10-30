import { useEffect } from 'react';
import { useCarActions, useCarState } from '../../state/CarStateContext';
import type { Gear } from '../../state/carState';
import styles from './GearSelect.module.css';

const GEARS: Gear[] = ['P', 'R', 'N', 'D'];

function GearSelect() {
  const { gear: activeGear } = useCarState();
  const { selectGear: onGearSelect } = useCarActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the active element is an input field
      if ((event.target as HTMLElement | null)?.tagName?.toLowerCase() === 'input') {
        return; // Exit the function if we're typing in an input field
      }

      // Both the 1-4 keys and the gear letters (as documented) select a gear.
      const key = event.key.toUpperCase();
      const gearMap: Record<string, Gear | undefined> = {
        1: 'P',
        2: 'R',
        3: 'N',
        4: 'D',
        P: 'P',
        R: 'R',
        N: 'N',
        D: 'D',
      };

      const gear = gearMap[key];
      if (gear) {
        onGearSelect(gear);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onGearSelect]);

  return (
    <div className={`${styles.gearSelect} no-select`}>
      {GEARS.map((gear) => (
        <span
          key={gear}
          className={`${styles.gearSelectIcon} ${activeGear === gear ? styles.active : ''}`}
          onClick={() => onGearSelect(gear)}
        >
          {gear}
        </span>
      ))}
    </div>
  );
}

export default GearSelect;
