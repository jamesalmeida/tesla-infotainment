import { useState, useEffect } from 'react';
import { useCar } from '../../state/CarStateContext';
import { formatTime } from '../../utils/units';

const Clock = () => {
  const [time, setTime] = useState(new Date());
  const format = useCar((state) => state.settings.preferences.timeFormat);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return <div className="no-select">{formatTime(time, format)}</div>;
};

export default Clock;
