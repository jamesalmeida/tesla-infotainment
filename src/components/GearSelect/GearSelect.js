import React, { useEffect } from 'react';
import './GearSelect.css';

function GearSelect({ activeGear, onGearSelect }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if the active element is an input field
      if (event.target.tagName.toLowerCase() === 'input') {
        return; // Exit the function if we're typing in an input field
      }

      if (event.shiftKey) {
        const gear = event.key.toUpperCase();
        if (['P', 'R', 'N', 'D'].includes(gear)) {
          onGearSelect(gear);
        }
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