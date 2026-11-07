import { useEffect, useState } from 'react';
import type { CarTracker } from './carTracker';
import {
  currentStepIndex,
  formatClock,
  formatDistance,
  formatDuration,
  maneuverAngle,
  remainingMeters,
  remainingMs,
  type Route,
} from './routeData';
import { useCarPose } from './useCarTracking';
import { useVoiceGuidance } from './useVoiceGuidance';
import styles from './TripPanel.module.css';

// The arrival time moves on even when the car doesn't, but only ever by the minute.
const CLOCK_REFRESH_MS = 15_000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function ManeuverArrow({ maneuver }: { maneuver: string | null }) {
  return (
    <svg
      className={styles.arrow}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: `rotate(${maneuverAngle(maneuver)}deg)` }}
    >
      <path d="M12 21V4M5 11l7-7 7 7" />
    </svg>
  );
}

interface TripPanelProps {
  route: Route;
  tracker: CarTracker;
}

/** Live guidance. Follows the car by itself, so the map doesn't re-render with it. */
export function TripPanel({ route, tracker }: TripPanelProps) {
  const along = useCarPose(tracker).along ?? 0;
  const now = useNow();
  const [listOpen, setListOpen] = useState(false);

  const { steps } = route;
  const stepIndex = currentStepIndex(steps, along);
  const step = steps[stepIndex] ?? null;
  const left = remainingMs(route, along);
  const voice = useVoiceGuidance(step?.instruction ?? null);

  return (
    <div className={styles.tripPanel}>
      {step && (
        <div className={styles.turnCard} data-testid="next-turn">
          <ManeuverArrow maneuver={step.maneuver} />
          <div className={styles.turnText}>
            <strong>{formatDistance(Math.max(0, step.endAlong - along))}</strong>
            <span>{step.instruction}</span>
          </div>
        </div>
      )}
      <dl className={styles.tripSummary}>
        {left !== null && (
          <>
            <div>
              <dt>Arrive</dt>
              <dd>{formatClock(now + left)}</dd>
            </div>
            <div>
              <dt>Time left</dt>
              <dd>{formatDuration(left)}</dd>
            </div>
          </>
        )}
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(remainingMeters(route, along))}</dd>
        </div>
      </dl>
      <div className={styles.tripTools}>
        {steps.length > 0 && (
          <button
            className={styles.tripTool}
            aria-expanded={listOpen}
            onClick={() => setListOpen(!listOpen)}
          >
            Directions
          </button>
        )}
        {voice.available && (
          <button className={styles.tripTool} aria-pressed={voice.on} onClick={voice.toggle}>
            Voice
          </button>
        )}
      </div>
      {listOpen && (
        <ol className={styles.directions} aria-label="Directions">
          {steps.map((item, index) => (
            <li
              key={`${index}-${item.endAlong}`}
              className={styles.direction}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <ManeuverArrow maneuver={item.maneuver} />
              <span>{item.instruction}</span>
              <span className={styles.directionDistance}>
                {formatDistance(item.distanceMeters)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
