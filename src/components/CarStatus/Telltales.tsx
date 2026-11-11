import { useEffect, useState, type ReactNode } from 'react';
import { useCar } from '../../state/CarStateContext';
import {
  dashcamState,
  hasTirePressureWarning,
  isHolding,
  sentryState,
  type CarState,
  type DashcamState,
} from '../../state/carState';
import { getTouchscreenPath } from '../../utils/assetPaths';
import styles from './Telltales.module.css';

interface Telltale {
  id: string;
  label: string;
  color: 'green' | 'blue' | 'amber' | 'red' | 'grey';
  isOn: (state: CarState) => boolean;
  glyph: ReactNode;
  // Shown as a word rather than a symbol, as the car does with PARK.
  text?: string;
}

const LOW_BATTERY_PERCENT = 10;
const CLIP_SAVED_MS = 2000;

// Glyphs are drawn here rather than copied from the car, and the set grows with the simulator.
const TELLTALES: Telltale[] = [
  {
    id: 'parked',
    label: 'Parking brake on',
    color: 'red',
    isOn: (state) => state.gear === 'P',
    glyph: null,
    text: 'PARK',
  },
  {
    id: 'auto-headlights',
    label: 'Automatic headlights',
    color: 'grey',
    isOn: (state) => state.settings.headlights === 'auto',
    glyph: (
      <>
        <path d="M11 6c4 0 6 3 6 6s-2 6-6 6z" />
        <path d="M8 8H3M8 12H3M8 16H3" />
        <path d="M17.5 18.5 20 12l2.5 6.5M18.4 16.3h3.2" />
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
    id: 'fog-lights',
    label: 'Fog lights on',
    color: 'green',
    isOn: (state) => state.settings.fogLights,
    glyph: <path d="M13 6c4 0 6 3 6 6s-2 6-6 6zM3 8l6 1M3 12l6 1M3 16l6 1" />,
  },
  {
    id: 'sentry',
    label: 'Sentry Mode on',
    color: 'red',
    isOn: (state) => sentryState(state) !== 'off',
    glyph: (
      <>
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },
  {
    id: 'autopilot',
    label: 'Autopilot engaged',
    color: 'blue',
    isOn: (state) => state.autopilot !== 'off',
    glyph: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
        <path d="M3 12h7M14 12h7M12 14v7" />
      </>
    ),
  },
  {
    id: 'hold',
    label: 'Vehicle hold on',
    color: 'green',
    isOn: isHolding,
    glyph: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8v8M15 8v8M9 12h6" />
      </>
    ),
  },
  {
    id: 'track-mode',
    label: 'Track Mode on',
    color: 'amber',
    isOn: (state) => state.settings.trackMode,
    glyph: <path d="M4 20V5M4 5h14l-3 4 3 4H4" />,
  },
  {
    id: 'closure-open',
    label: 'Frunk or trunk open',
    color: 'amber',
    isOn: (state) => state.openCompartment !== null,
    glyph: <path d="M3 15h18l-2-5H8L5 7M7 15v2M17 15v2" />,
  },
  {
    id: 'tire-pressure',
    label: 'Low tire pressure',
    color: 'amber',
    isOn: hasTirePressureWarning,
    // A tire in cross-section with an exclamation mark, the usual pressure warning.
    glyph: (
      <>
        <path d="M6.5 6.5a8 8 0 0 0 0 11M17.5 6.5a8 8 0 0 1 0 11M6.5 17.5h11" />
        <path d="M12 8v5M12 15.5v.5" />
      </>
    ),
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

  if (telltale.text) {
    return (
      <span
        className={`${styles.word} ${styles[telltale.color]}`}
        role="img"
        aria-label={telltale.label}
      >
        {telltale.text}
      </span>
    );
  }

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

const DASHCAM_ICONS: Record<Exclude<DashcamState, 'off'>, { file: string; label: string }> = {
  recording: { file: 'dashcam-recording.png', label: 'Dashcam recording' },
  paused: { file: 'dashcam-paused.png', label: 'Dashcam paused' },
};

// Recording state, with a moment of "saved" each time a clip is kept.
function DashcamIndicator() {
  const status = useCar(dashcamState);
  const latestClip = useCar((state) => state.dashcamClips[0]?.id ?? 0);
  const [acknowledgedClip, setAcknowledgedClip] = useState(latestClip);

  useEffect(() => {
    const timer = setTimeout(() => setAcknowledgedClip(latestClip), CLIP_SAVED_MS);
    return () => clearTimeout(timer);
  }, [latestClip]);

  if (status === 'off') return null;
  const icon =
    latestClip !== acknowledgedClip
      ? { file: 'dashcam-saved.png', label: 'Dashcam clip saved' }
      : DASHCAM_ICONS[status];

  return (
    <img
      className={styles.dashcam}
      src={getTouchscreenPath(`car_control/${icon.file}`)}
      alt={icon.label}
    />
  );
}

export function Telltales() {
  return (
    <div className={styles.telltales}>
      {TELLTALES.map((telltale) => (
        <TelltaleIcon key={telltale.id} telltale={telltale} />
      ))}
      <DashcamIndicator />
    </div>
  );
}
