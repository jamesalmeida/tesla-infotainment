import { useEffect, useState } from 'react';
import { Callout, ui } from '../../../../apps/ui/AppScreen';
import { LAMPS, litLamps, PATTERNS, type Lamp } from './lightPatterns';
import styles from './LightShow.module.css';

const LAMP_POSITION: Record<Lamp, { cx: number; cy: number }> = {
  headLeft: { cx: 60, cy: 26 },
  headRight: { cx: 140, cy: 26 },
  sideLeft: { cx: 38, cy: 110 },
  sideRight: { cx: 162, cy: 110 },
  tailLeft: { cx: 62, cy: 196 },
  tailRight: { cx: 138, cy: 196 },
};

function useShowClock(isRunning: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const started = performance.now();
    const timer = setInterval(() => setSeconds((performance.now() - started) / 1000), 50);
    return () => clearInterval(timer);
  }, [isRunning]);

  return seconds;
}

// A top-down sketch of the car, so this works without the 3D model's lights (#112).
export function LightShow() {
  const [patternId, setPatternId] = useState(PATTERNS[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const seconds = useShowClock(isRunning);

  const pattern = PATTERNS.find((item) => item.id === patternId) ?? PATTERNS[0];
  const lit = isRunning ? litLamps(pattern, seconds) : [];

  return (
    <div className={styles.show}>
      <svg className={styles.car} viewBox="0 0 200 220" role="img" aria-label="Car lights">
        <rect className={styles.body} x="44" y="14" width="112" height="192" rx="42" />
        <rect className={styles.glass} x="60" y="62" width="80" height="94" rx="20" />
        {LAMPS.map((lamp) => (
          <circle
            key={lamp}
            {...LAMP_POSITION[lamp]}
            r={lit.includes(lamp) ? 15 : 9}
            className={`${styles.lamp} ${lit.includes(lamp) ? styles.lit : ''}`}
            data-lamp={lamp}
          />
        ))}
      </svg>
      <div className={styles.controls}>
        <div className={ui.inline}>
          {PATTERNS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === patternId}
              className={`${ui.button} ${item.id === patternId ? ui.primary : ''}`}
              onClick={() => setPatternId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className={ui.button} onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? 'Stop show' : 'Start show'}
        </button>
        <Callout>Flashing lights: the show only runs while you have it started.</Callout>
      </div>
    </div>
  );
}
