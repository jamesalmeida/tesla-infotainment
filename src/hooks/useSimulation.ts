import { useEffect } from 'react';
import { useCar, useCarActions } from '../state/CarStateContext';
import { isSimulationActive } from '../state/carState';
import { keyboardMode, PEDAL_KEYS } from './shortcuts';

const TICK_MS = 100;

// Advances the car while anything is changing, and stops completely when nothing is.
export function useSimulation() {
  const isActive = useCar(isSimulationActive);
  const { setPedal, tick } = useCarActions();

  useEffect(() => {
    if (!isActive) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      tick((now - last) / 1000);
      last = now;
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isActive, tick]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pedal = PEDAL_KEYS[event.key];
      if (!pedal || event.repeat || event.shiftKey || event.metaKey || event.ctrlKey) return;
      if (keyboardMode(event.target) !== 'normal') return;
      event.preventDefault();
      setPedal(pedal);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (PEDAL_KEYS[event.key]) setPedal('none');
    };
    // A released key is never reported to a window that lost focus.
    const handleBlur = () => setPedal('none');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setPedal]);
}
