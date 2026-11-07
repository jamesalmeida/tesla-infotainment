import { useEffect, useSyncExternalStore } from 'react';
import { useCar } from '../../state/CarStateContext';
import type { Appearance } from '../../state/carState';
import styles from './DisplayEffects.module.css';

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Full blue-light reduction, as the strength of the warm layer.
const MAX_TINT = 0.35;

const subscribeToOsTheme = (onChange: () => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const osIsDark = () => window.matchMedia(DARK_QUERY).matches;

export const resolveTheme = (appearance: Appearance, isOsDark: boolean): 'light' | 'dark' => {
  if (appearance === 'auto') return isOsDark ? 'dark' : 'light';
  return appearance;
};

function useTheme() {
  const appearance = useCar((state) => state.display.appearance);
  const isOsDark = useSyncExternalStore(subscribeToOsTheme, osIsDark);
  const theme = resolveTheme(appearance, isOsDark);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

// What the display settings do to the whole screen, wherever Settings happens to be.
export function DisplayEffects() {
  const blueLight = useCar((state) => state.display.blueLightReduction);
  useTheme();

  return (
    <div
      className={styles.nightTint}
      style={{ opacity: (blueLight / 100) * MAX_TINT }}
      aria-hidden="true"
    />
  );
}
