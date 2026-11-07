import { useState } from 'react';
import { useCar } from '../../../state/CarStateContext';
import { BackupCam } from '../BackupCam/BackupCam';
import styles from './Camera.module.css';

const VIEWS = [
  { id: 'rear', label: 'Rear' },
  { id: 'front', label: 'Front' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
] as const;

type CameraView = (typeof VIEWS)[number]['id'];

function SimulatedView({ view }: { view: Exclude<CameraView, 'rear'> }) {
  return (
    <div className={`${styles.simulated} ${styles[view]}`} role="img" aria-label={`${view} camera`}>
      <div className={styles.horizon} />
      <div className={styles.road} />
      <div className={styles.lane} />
      <span className={styles.label}>Simulated {view} camera</span>
    </div>
  );
}

// The rear view is the real camera feed. The other angles are clearly-labelled simulations,
// because a laptop or phone only has one camera.
export function Camera() {
  const gear = useCar((state) => state.gear);
  const [selectedView, setView] = useState<CameraView>('rear');
  // Reverse always shows the rear camera, whatever was selected before.
  const view = gear === 'R' ? 'rear' : selectedView;

  return (
    <div className={styles.camera}>
      <div className={styles.views} role="tablist" aria-label="Camera views">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            className={view === option.id ? styles.active : ''}
            onClick={() => setView(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.feed}>
        {view === 'rear' ? <BackupCam /> : <SimulatedView view={view} />}
      </div>
    </div>
  );
}
