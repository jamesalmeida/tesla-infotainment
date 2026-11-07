import { useState, type CSSProperties } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import { useDots } from '../../utils/dots';
import styles from './LoadingScreen.module.css';

const loadingMessages = [
  'Charging flux capacitor',
  'Reticulating splines',
  'Calibrating autopilot',
  'Syncing with Starlink',
  'Booting up neural lace',
  "Don't panic",
  'Constructing additional pylons',
  'Proving P=NP',
  'Tokenizing real life',
  'Follow the white rabbit',
  '(Insert quarter)',
  'Counting backwards from Infinity',
  'Stay awhile... and listen',
  'Computing the secret to life, the universe, and everything',
  'Downloading your daily traffic jam',
  'Calculating optimal Hohmann transfer orbit to Mars',
  'Spooling up the hyperdrive',
  'Synchronizing with the mothership',
  'Turning on the wipers for sarcasm',
  "Putting the 'auto' in autopilot",
  'Mining Dogecoin',
  'Ensuring zero emissions and maximum fun',
  'Groking your prefered routes',
];

const TICK_COUNT = 48;
const SWEEP_SECONDS = 2;

const ChargeRing = () => (
  <svg
    className={styles['charge-ring']}
    viewBox="0 0 200 200"
    aria-hidden="true"
    style={{ '--charge-sweep-duration': `${SWEEP_SECONDS}s` } as CSSProperties}
  >
    {Array.from({ length: TICK_COUNT }, (_, tick) => (
      <line
        key={tick}
        className={styles['charge-tick']}
        x1="100"
        y1="6"
        x2="100"
        y2="22"
        transform={`rotate(${(tick * 360) / TICK_COUNT} 100 100)`}
        // A negative delay starts each tick part-way through, so the sweep is already running.
        style={{ animationDelay: `${((tick / TICK_COUNT - 1) * SWEEP_SECONDS).toFixed(3)}s` }}
      />
    ))}
  </svg>
);

interface LoadingScreenProps {
  // 'wake' reuses the boot visuals for the welcome animation after the car wakes.
  variant?: 'boot' | 'wake';
}

const LoadingScreen = ({ variant = 'boot' }: LoadingScreenProps) => {
  const [bootText] = useState(
    () => loadingMessages[Math.floor(Math.random() * loadingMessages.length)],
  );
  const loadingText = variant === 'wake' ? 'Welcome back' : bootText;
  const dots = useDots();

  return (
    <div className={styles['loading-overlay']}>
      <div className="displayBezel">
        <div className={styles.displayInsideBezel}>
          <ChargeRing />
          <img
            src={getImagePath('logo-grey.svg')}
            alt="Tesla Logo"
            className={styles['tesla-logo']}
          />
          <p className={styles['loading-text']}>
            {loadingText}
            {dots}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
