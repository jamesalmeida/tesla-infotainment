import { useEffect } from 'react';
import { useCar, useCarActions } from '../state/CarStateContext';
import { scheduleRunDate } from '../state/carState';

// Often enough that no minute can be skipped, even with a timer that runs a little late.
const CHECK_MS = 15000;

// Scheduled entries go by the real clock, so they keep their time with the car standing still.
export function useSchedule() {
  const schedule = useCar((state) => state.schedule);
  const { runSchedule } = useCarActions();

  useEffect(() => {
    if (!schedule.some((entry) => entry.enabled)) return;
    const check = () => {
      const now = new Date();
      for (const entry of schedule) {
        const date = scheduleRunDate(entry, now);
        if (date) runSchedule(entry.id, date);
      }
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    return () => clearInterval(timer);
  }, [schedule, runSchedule]);
}
