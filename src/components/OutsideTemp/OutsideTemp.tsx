import { useState, useEffect } from 'react';
import { useCar } from '../../state/CarStateContext';
import { formatTemperature } from '../../utils/units';

const OutsideTemp = () => {
  const [temperature, setTemperature] = useState<number | null>(null);
  const unit = useCar((state) => state.settings.preferences.temperature);

  // Simulated API call to get temperature
  const fetchTemperature = () => {
    // In a real application, this would be an actual API call
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        const mockTemp = Math.floor(Math.random() * (95 - 65) + 65); // Random temp between 65-95°F
        resolve(mockTemp);
      }, 1000);
    });
  };

  useEffect(() => {
    fetchTemperature().then((temp) => setTemperature(temp));

    // Refresh temperature every 5 minutes
    const intervalId = setInterval(
      () => {
        fetchTemperature().then((temp) => setTemperature(temp));
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, []);

  // For demonstration: allow manual temperature update
  const handleTempClick = () => {
    fetchTemperature().then((temp) => setTemperature(temp));
  };

  if (temperature === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="no-select" onClick={handleTempClick}>
      {formatTemperature(temperature, unit)}
    </div>
  );
};

export default OutsideTemp;
