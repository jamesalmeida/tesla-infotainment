import React, { useState } from 'react';
import './BatteryStatus.css';


const BatteryStatus = () => {
  const [batteryPercentage, setBatteryPercentage] = useState(69);
  const [showMiles, setShowMiles] = useState(false);
  const [animatingBattery, setAnimatingBattery] = useState(false);

  const calculateMiles = (percentage) => {
    return Math.round((percentage / 100) * 310);
  };

  const toggleMilesDisplay = () => {
    setShowMiles(!showMiles);
  };

  const randomizeBatteryPercentage = () => {
    const newPercentage = Math.floor(Math.random() * 101); // 0-100
    setAnimatingBattery(true);
    setBatteryPercentage(newPercentage);
    setTimeout(() => setAnimatingBattery(false), 300); // Match this with the CSS transition duration
  };

  return (
    <div className="batteryStatus no-select">
      <span onClick={toggleMilesDisplay}>
        {showMiles ? `${calculateMiles(batteryPercentage)} mi` : `${batteryPercentage}%`}
      </span>
      <svg 
        className="icon" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        onClick={randomizeBatteryPercentage}
      >
        <rect x="2" y="6" width="20" height="12" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect 
          x="4" 
          y="8" 
          width={`${batteryPercentage * 16 / 100}`} 
          height="8" 
          fill="currentColor"
          className={animatingBattery ? 'battery-fill-animate' : ''}
        />
        <rect x="23" y="10" width="2" height="4" fill="currentColor"/>
      </svg>
    </div>
  );
};

export default BatteryStatus;