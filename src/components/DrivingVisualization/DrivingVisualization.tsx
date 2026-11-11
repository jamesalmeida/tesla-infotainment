import type { CSSProperties } from 'react';
import { useCar } from '../../state/CarStateContext';
import { isDriving } from '../../state/carState';
import styles from './DrivingVisualization.module.css';

const LANE_DASHES = Array.from({ length: 7 }, (_, index) => index);
const TRAFFIC = [
  { lane: 'left', top: 22, delay: 0 },
  { lane: 'right', top: 38, delay: -1.2 },
  { lane: 'left', top: 58, delay: -2.4 },
] as const;

// A stylised road behind the 3D car while it is moving. It is drawn in the same panel as
// the car, so the speed, lanes and nearby traffic read as one scene.
export function DrivingVisualization() {
  const driving = useCar(isDriving);
  const speed = useCar((state) => state.speed);
  const autopilot = useCar((state) => state.autopilot);

  if (!driving) return null;

  // Faster means the road moves past faster, down to a short but still readable loop.
  const dashSeconds = Math.max(0.22, 1.35 - speed * 0.012);
  const isMoving = speed > 0;

  return (
    <div
      className={styles.scene}
      aria-hidden="true"
      style={
        {
          '--dash-seconds': `${dashSeconds.toFixed(2)}s`,
          '--dash-state': isMoving ? 'running' : 'paused',
        } as CSSProperties
      }
    >
      <div className={styles.sky} />
      <div className={styles.road}>
        <div className={`${styles.lane} ${styles.leftLane}`}>
          {LANE_DASHES.map((dash) => (
            <span
              key={dash}
              className={styles.dash}
              style={{ top: `${dash * 16}%`, animationDelay: `${-dash * 0.18}s` }}
            />
          ))}
        </div>
        <div className={styles.route} />
        <div className={`${styles.lane} ${styles.rightLane}`}>
          {LANE_DASHES.map((dash) => (
            <span
              key={dash}
              className={styles.dash}
              style={{ top: `${dash * 16}%`, animationDelay: `${-dash * 0.18}s` }}
            />
          ))}
        </div>
        {TRAFFIC.map((car) => (
          <span
            key={`${car.lane}-${car.top}`}
            className={`${styles.traffic} ${styles[car.lane]}`}
            style={{ top: `${car.top}%`, animationDelay: `${car.delay}s` }}
          />
        ))}
        <span className={`${styles.cone} ${styles.coneLeft}`} />
        <span className={`${styles.cone} ${styles.coneRight}`} />
      </div>
      <div className={styles.hud}>
        <span>{Math.round(speed)} mph</span>
        {autopilot !== 'off' && <span className={styles.autopilot}>Autopilot</span>}
      </div>
    </div>
  );
}
