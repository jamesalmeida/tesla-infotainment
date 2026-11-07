import { useEffect, useRef } from 'react';
import { useCar, useCarActions } from '../../../../../state/CarStateContext';
import type { CarState } from '../../../../../state/carState';
import styles from './CarWashMode.module.css';

interface ChecklistItem {
  label: string;
  isReady: (state: CarState) => boolean;
}

// Each row reads the car, so a tick is a fact and not a promise.
const CHECKLIST: ChecklistItem[] = [
  { label: 'Windows closed', isReady: (state) => !state.settings.windowsVented },
  {
    label: 'Charge port locked',
    isReady: (state) => !state.chargePortOpen && state.chargeState === 'unplugged',
  },
  { label: 'Wipers off', isReady: (state) => state.settings.wipers.mode === 'off' },
  { label: 'Sentry off', isReady: (state) => !state.settings.sentry },
];

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const isReady = useCar(item.isReady);

  return (
    <li className={styles.item}>
      <span
        className={`${styles.mark} ${isReady ? styles.ready : ''}`}
        role="img"
        aria-label={isReady ? 'Done' : 'Not done'}
      >
        {isReady ? '✓' : '!'}
      </span>
      {item.label}
    </li>
  );
}

function CarWashScreen() {
  const isFreeRolling = useCar((state) => state.gear === 'N');
  const { exitMode, selectGear } = useCarActions();
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => exitRef.current?.focus(), []);

  return (
    <div
      className={styles['car-wash-mode-container']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="car-wash-title"
    >
      <div className={styles.intro}>
        <h2 id="car-wash-title" className={styles['car-wash-mode-title']}>
          Car Wash Mode
        </h2>
        <p>The car has got itself ready. Everything goes back when you leave.</p>
      </div>
      <ul className={styles.checklist}>
        {CHECKLIST.map((item) => (
          <ChecklistRow key={item.label} item={item} />
        ))}
      </ul>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${isFreeRolling ? styles.active : ''}`}
          aria-pressed={isFreeRolling}
          onClick={() => selectGear(isFreeRolling ? 'P' : 'N')}
        >
          Free Roll
        </button>
        <button ref={exitRef} type="button" className={styles.action} onClick={exitMode}>
          Exit Car Wash Mode
        </button>
      </div>
      <p className={styles.freeRoll}>
        {isFreeRolling
          ? 'In Neutral: the car can roll on a conveyor.'
          : 'Free Roll shifts to Neutral for a conveyor wash.'}
      </p>
    </div>
  );
}

// Lives at display level: it outlasts Settings, and leaving Park is what ends it.
export default function CarWashMode() {
  const isOn = useCar((state) => state.overlayMode === 'car-wash');
  return isOn ? <CarWashScreen /> : null;
}
