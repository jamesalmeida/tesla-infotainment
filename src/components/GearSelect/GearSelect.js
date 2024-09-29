import React, { useEffect } from 'react';
import './GearSelect.css';

function GearSelect({ activeGear, onGearSelect }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const gear = event.key.toUpperCase();
      if (['P', 'R', 'N', 'D'].includes(gear)) {
        onGearSelect(gear);
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