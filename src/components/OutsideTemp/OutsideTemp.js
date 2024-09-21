import React, { useState, useEffect } from 'react';
import './OutsideTemp.css';

const OutsideTemp = () => {
  const [temperature, setTemperature] = useState(null);

  // Simulated API call to get temperature
  const fetchTemperature = () => {
    // In a real application, this would be an actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockTemp = Math.floor(Math.random() * (95 - 65) + 65); // Random temp between 65-95°F
        resolve(mockTemp);
      }, 1000);
    });
  };

  useEffect(() => {
    fetchTemperature().then(temp => setTemperature(temp));

    // Refresh temperature every 5 minutes
    const intervalId = setInterval(() => {
      fetchTemperature().then(temp => setTemperature(temp));
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // For demonstration: allow manual temperature update
  const handleTempClick = () => {
    fetchTemperature().then(temp => setTemperature(temp));
  };

  if (temperature === null) {
    return <div className="outsideTemp">Loading...</div>;
  }

  return (
    <div className="outsideTem no-select" onClick={handleTempClick}>
      {temperature}°F
    </div>
  );
};

export default OutsideTemp;