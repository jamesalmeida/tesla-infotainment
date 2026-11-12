import type { MouseEvent } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type { Gear } from '../../state/carState';
import styles from './GearSelect.module.css';

const GEARS: Gear[] = ['P', 'R', 'N', 'D'];

function GearSelect() {
  const activeGear = useCar((state) => state.gear);
  const { selectGear } = useCarActions();

  // On touch the letters sit closer than their full-size targets, so the targets overlap. A tap
  // picks the letter nearest the finger, not whichever overlapping target is on top.
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const pressed = (event.target as Element).closest('button');
    if (!pressed) return;
    // A key press clicks the focused button, with no position to go by.
    if (event.detail === 0) {
      selectGear(GEARS[buttons.indexOf(pressed)]);
      return;
    }
    const distance = (button: HTMLButtonElement) => {
      const box = button.getBoundingClientRect();
      return Math.abs(event.clientX - (box.left + box.width / 2));
    };
    const nearest = buttons.reduce((best, button) =>
      distance(button) < distance(best) ? button : best,
    );
    selectGear(GEARS[buttons.indexOf(nearest)]);
  };

  return (
    <div className={`${styles.gearSelect} no-select`} onClick={handleClick}>
      {GEARS.map((gear) => (
        <button
          key={gear}
          type="button"
          className={`${styles.gearSelectIcon} ${activeGear === gear ? styles.active : ''}`}
          aria-pressed={activeGear === gear}
        >
          {gear}
        </button>
      ))}
    </div>
  );
}

export default GearSelect;
