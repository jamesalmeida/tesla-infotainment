import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoHidePhase = 'hidden' | 'visible' | 'fading';

const VISIBLE_MS = 3000;
// Matches the CSS opacity transition on the element.
const FADE_MS = 300;

// hidden -> visible -> fading -> hidden, with one timer. Any activity returns to visible.
export function useAutoHide() {
  const [phase, setPhase] = useState<AutoHidePhase>('hidden');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase('hidden');
  }, []);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase('visible');
    timerRef.current = setTimeout(() => {
      setPhase('fading');
      timerRef.current = setTimeout(() => setPhase('hidden'), FADE_MS);
    }, VISIBLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { phase, show, hide };
}
