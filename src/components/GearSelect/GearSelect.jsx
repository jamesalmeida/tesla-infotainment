import { useEffect } from 'react';
import './GearSelect.css';

function GearSelect({ activeGear, onGearSelect }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if the active element is an input field
      if (event.target?.tagName?.toLowerCase() === 'input') {
        return; // Exit the function if we're typing in an input field
      }

      // Both the 1-4 keys and the gear letters (as documented) select a gear.
      const key = event.key.toUpperCase();
      const gearMap = {
        1: 'P',
        2: 'R',
        3: 'N',
        4: 'D',
        P: 'P',
        R: 'R',
        N: 'N',
        D: 'D',
      };

      if (gearMap[key]) {
        onGearSelect(gearMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onGearSelect]);

  return (
    <div className="gearSelect no-select">
      {['P', 'R', 'N', 'D'].map((gear) => (
        <span
          key={gear}
          className={`gearSelectIcon ${activeGear === gear ? 'active' : ''}`}
          onClick={() => onGearSelect(gear)}
        >
          {gear}
        </span>
      ))}
    </div>
  );
}

export default GearSelect;
