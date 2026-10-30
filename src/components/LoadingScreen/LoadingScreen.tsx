import { useState } from 'react';
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

const LoadingScreen = () => {
  const [loadingText] = useState(
    () => loadingMessages[Math.floor(Math.random() * loadingMessages.length)],
  );
  const dots = useDots();

  return (
    <div className={styles['loading-screen']}>
      <div className={styles.displayInsideBezel}>
        <div className={styles['circle-container']}>
          <div className={styles.circle}></div>
          <div className={styles['circle-small']}></div>
          <div className={styles['circle-big']}></div>
          <div className={styles['circle-inner-inner']}></div>
          <div className={styles['circle-inner']}></div>
        </div>
        <img
          src={getImagePath('logo-grey.svg')}
          alt="Tesla Logo"
          className={`${styles['tesla-logo']} spinning`}
        />
        <p className={styles['loading-text']}>
          {loadingText}
          {dots}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
