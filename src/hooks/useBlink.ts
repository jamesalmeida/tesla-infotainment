import { useEffect, useState } from 'react';

export const BLINK_MS = 500;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One clock for every indicator, so the car and the on-screen arrows stay in step.
// With reduced motion the light stays on: it still shows state, without flashing.
export function useBlink(isActive: boolean) {
  const [isOn, setIsOn] = useState(true);

  useEffect(() => {
    if (!isActive || prefersReducedMotion()) {
      setIsOn(true);
      return;
    }
    const timer = setInterval(() => setIsOn((on) => !on), BLINK_MS);
    return () => {
      clearInterval(timer);
      setIsOn(true);
    };
  }, [isActive]);

  return isOn;
}
