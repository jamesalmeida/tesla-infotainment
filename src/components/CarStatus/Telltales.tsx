import type { ReactNode } from 'react';
import { useCar } from '../../state/CarStateContext';
import { type CarState } from '../../state/carState';
import styles from './Telltales.module.css';

interface Telltale {
  id: string;
  label: string;
  color: 'green' | 'blue' | 'amber' | 'red';
  isOn: (state: CarState) => boolean;
  glyph: ReactNode;
}

const LOW_BATTERY_PERCENT = 10;

// Glyphs are drawn here rather than copied from the car, and the set grows with the simulator.
const TELLTALES: Telltale[] = [
  {
    id: 'parked',
    label: 'Parking brake on',
    color: 'red',
    isOn: (state) => state.gear === 'P',
    glyph: (
      <>
        <circle cx="12" cy="12" r="7" />
        <path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3" />
      </>
    ),
  },
  {
    id: 'headlights',
    label: 'Headlights on',
    color: 'green',
    isOn: (state) => state.settings.headlights === 'on',
    glyph: <path d="M12 6c4 0 6 3 6 6s-2 6-6 6zM9 8H3M9 12H3M9 16H3" />,
  },
  {
    id: 'high-beams',
    label: 'High beams on',
    color: 'blue',
    isOn: (state) => state.settings.highBeams,
    glyph: <path d="M12 6c4 0 6 3 6 6s-2 6-6 6zM9 7H3M9 10H3M9 14H3M9 17H3" />,
  },
  {
    id: 'closure-open',
    label: 'Frunk or trunk open',
    color: 'amber',
    isOn: (state) => state.openCompartment !== null,
    glyph: <path d="M3 15h18l-2-5H8L5 7M7 15v2M17 15v2" />,
  },
  {
    id: 'low-battery',
    label: 'Battery low',
    color: 'amber',
    isOn: (state) => state.batteryPercent <= LOW_BATTERY_PERCENT,
    glyph: <path d="M4 8h14v8H4zM18 11h2v2h-2zM7 11v2" />,
  },
];

function TelltaleIcon({ telltale }: { telltale: Telltale }) {
  const isOn = useCar(telltale.isOn);
  if (!isOn) return null;

  return (
    <svg
      className={`${styles.telltale} ${styles[telltale.color]}`}
      viewBox="0 0 24 24"
      role="img"
      aria-label={telltale.label}
    >
      {telltale.glyph}
    </svg>
  );
}

export function Telltales() {
  return (
    <div className={styles.telltales}>
      {TELLTALES.map((telltale) => (
        <TelltaleIcon key={telltale.id} telltale={telltale} />
      ))}
    </div>
  );
}
