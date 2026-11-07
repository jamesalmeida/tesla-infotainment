import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useCar } from '../../state/CarStateContext';
import { isParked, type Appearance } from '../../state/carState';
import styles from './DisplayEffects.module.css';

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Full blue-light reduction, as the strength of the warm layer.
const MAX_TINT = 0.35;
const CHIME_HZ = 880;
const CHIME_SECONDS = 0.12;

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

function playLockChime() {
  if (typeof AudioContext === 'undefined') return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  gain.gain.value = 0.05;
  oscillator.frequency.value = CHIME_HZ;
  oscillator.connect(gain).connect(audio.destination);
  oscillator.onended = () => void audio.close();
  oscillator.start();
  oscillator.stop(audio.currentTime + CHIME_SECONDS);
}

// Only in Park: locking on the way out is the moment the sound is for, not drive-away.
function useLockChime() {
  const isLocked = useCar((state) => state.isLocked);
  const parked = useCar(isParked);
  const isEnabled = useCar((state) => state.settings.lockSound);
  const wasLocked = useRef(isLocked);

  useEffect(() => {
    if (isLocked && !wasLocked.current && parked && isEnabled) playLockChime();
    wasLocked.current = isLocked;
  }, [isLocked, parked, isEnabled]);
}

// What the display settings do to the whole screen, wherever Settings happens to be.
export function DisplayEffects() {
  const blueLight = useCar((state) => state.display.blueLightReduction);
  useTheme();
  useLockChime();

  return (
    <div
      className={styles.nightTint}
      style={{ opacity: (blueLight / 100) * MAX_TINT }}
      aria-hidden="true"
    />
  );
}
