import { useEffect, useState } from 'react';
import { useCar } from '../../state/CarStateContext';
import { FULL_RANGE_MILES } from '../../state/carState';
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
  /** Where the trip ends, as the card names it. */
  destination?: string;
  /** Ends the trip. Left out, the card has no End Trip button. */
  onEnd?: () => void;
}

const focusSearch = () => document.getElementById('navigateTo')?.focus();

/**
 * Live guidance, laid out as the car does it: the next turn in a card at the top, where the
 * search box sits otherwise, and the trip at the bottom with End Trip. Follows the car by
 * itself, so the map doesn't re-render with it.
 */
export function TripPanel({ route, tracker, destination, onEnd }: TripPanelProps) {
  const along = useCarPose(tracker).along ?? 0;
  const now = useNow();
  const [listOpen, setListOpen] = useState(false);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const arrivalTarget = useCar((state) => state.settings.arrivalChargeTarget);

  const { steps } = route;
  const stepIndex = currentStepIndex(steps, along);
  const step = steps[stepIndex] ?? null;
  const nextStep = steps[stepIndex + 1] ?? null;
  const left = remainingMs(route, along);
  const remaining = remainingMeters(route, along);
  const progress = route.pathMeters > 0 ? Math.min(1, Math.max(0, along / route.pathMeters)) : 0;
  const arrivalBattery = Math.max(
    0,
    Math.round(batteryPercent - (remaining / 1609.344 / FULL_RANGE_MILES) * 100),
  );
  const needsCharge = arrivalBattery < arrivalTarget;
  const voice = useVoiceGuidance(step?.instruction ?? null);

  return (
    <div className={styles.tripPanel}>
      {step && (
        <div className={styles.turnCard} data-testid="next-turn">
          <div className={styles.turnMain}>
            <ManeuverArrow maneuver={step.maneuver} />
            <div className={styles.turnText}>
              <strong>{formatDistance(Math.max(0, step.endAlong - along))}</strong>
              <span>{step.instruction}</span>
            </div>
          </div>
          {nextStep && (
            <div className={styles.turnNext}>
              <ManeuverArrow maneuver={nextStep.maneuver} />
              <span>{nextStep.instruction}</span>
              <span className={styles.directionDistance}>
                {formatDistance(nextStep.distanceMeters)}
              </span>
            </div>
          )}
        </div>
      )}
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
      <div className={styles.tripCard}>
        {needsCharge && (
          <p className={styles.chargeHint} role="status">
            Charge stop suggested. Your target is {arrivalTarget}%.
          </p>
        )}
        <dl className={styles.tripSummary}>
          {left !== null && (
            <div className={styles.arrive}>
              <dt>Arrive</dt>
              <dd>{formatClock(now + left)}</dd>
            </div>
          )}
          <div className={styles.legs}>
            {left !== null && (
              <div>
                <dt>Time left</dt>
                <dd>{formatDuration(left)}</dd>
              </div>
            )}
            <div>
              <dt>Distance</dt>
              <dd>{formatDistance(remaining)}</dd>
            </div>
          </div>
          {destination && <div className={styles.destination}>{destination}</div>}
          <div className={styles.battery}>
            <dt>On arrival</dt>
            <dd>
              <span className={styles.batteryIcon} aria-hidden="true" />
              {arrivalBattery}%
            </dd>
          </div>
        </dl>
        <div className={styles.progress} aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <div className={styles.tripTools}>
          <button
            type="button"
            className={styles.tripIcon}
            aria-label="Search for a place"
            onClick={focusSearch}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10Z" />
              <path d="M19 15v6M16 18h6" />
            </svg>
          </button>
          {onEnd && (
            <button type="button" className={styles.endTrip} onClick={onEnd}>
              End Trip
            </button>
          )}
          {voice.available && (
            <button
              type="button"
              className={styles.tripIcon}
              aria-label="Voice"
              aria-pressed={voice.on}
              onClick={voice.toggle}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 10v4h4l5 4V6L8 10Z" />
                {voice.on && <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
              </svg>
            </button>
          )}
          {steps.length > 0 && (
            <button
              type="button"
              className={styles.tripIcon}
              aria-label="Directions"
              aria-expanded={listOpen}
              onClick={() => setListOpen(!listOpen)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="6" cy="12" r="1.4" />
                <circle cx="12" cy="12" r="1.4" />
                <circle cx="18" cy="12" r="1.4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
