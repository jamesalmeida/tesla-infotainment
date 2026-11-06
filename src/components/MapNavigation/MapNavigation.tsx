import { useCallback, useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { getImagePath } from '../../utils/assetPaths';
import CarLock from '../CarLock/CarLock';
import Clock from '../Clock/Clock';
import OutsideTemp from '../OutsideTemp/OutsideTemp';
import UserProfile from '../UserProfile/UserProfile';
import { MapFallback } from './MapFallback';
import { usableMapsKey, type MapsFailure } from './mapsAvailability';
import { MapStage } from './MapStage';
import styles from './MapNavigation.module.css';

declare global {
  interface Window {
    /** Google calls this global when it rejects the key. The map library doesn't handle it. */
    gm_authFailure?: () => void;
  }
}

interface MapNavigationProps {
  onWifiClick: () => void;
}

export function MapNavigation({ onWifiClick }: MapNavigationProps) {
  const apiKey = usableMapsKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [failure, setFailure] = useState<MapsFailure | null>(null);

  const handleLoadError = useCallback((error: unknown) => {
    console.error('The Google Maps JavaScript API failed to load', error);
    setFailure('loadFailed');
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => setFailure('authFailed');
    return () => {
      window.gm_authFailure = previous;
    };
  }, [apiKey]);

  return (
    <div className={styles.MapNavigation}>
      <div className={styles.topMenuBar}>
        <div className={styles.carLockWrapper}>
          <CarLock />
        </div>
        <UserProfile />
        <div className={styles.wifiStatus}>
          <img src={getImagePath('icon-wifi.svg')} alt="Wifi Status" onClick={onWifiClick} />
        </div>
        <div className="clock">
          <Clock />
        </div>
        <div className={styles.outsideTemp}>
          <OutsideTemp />
        </div>
        <div className={`${styles.airbagStatus} no-select`}>
          <img src={getImagePath('icon-airbags.svg')} alt="Airbag Status" />
          <div className={styles.airbagStatusText}>
            PASSENGER AIRBAG&nbsp;<span className={styles.airbagStatusOff}>OFF</span>
          </div>
        </div>
      </div>
      {/* No APIProvider without a key: it would still load Google's script. */}
      {apiKey && !failure ? (
        <APIProvider apiKey={apiKey} onError={handleLoadError}>
          <MapStage />
        </APIProvider>
      ) : (
        <MapFallback failure={failure ?? 'missingKey'} />
      )}
    </div>
  );
}
