import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { safeStorage } from '../../utils/safeStorage';
import styles from './PwaUpdate.module.css';

const INSTALL_HINT_KEY = 'tesla-install-hint-dismissed';
const OFFLINE_READY_MS = 5000;

const isIos = () =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function PwaUpdateInner() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [showInstallHint, setShowInstallHint] = useState(
    () => isIos() && !isStandalone() && safeStorage.getItem(INSTALL_HINT_KEY) !== '1',
  );

  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_READY_MS);
    return () => clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className={styles.banner} role="status">
        <span>A new version is ready.</span>
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Reload
        </button>
        <button type="button" className={styles.dismiss} onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className={styles.banner} role="status">
        <span>Ready to work offline.</span>
      </div>
    );
  }

  if (showInstallHint) {
    return (
      <div className={styles.banner} role="note">
        <span>Add to Home Screen for a full-screen display.</span>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => {
            safeStorage.setItem(INSTALL_HINT_KEY, '1');
            setShowInstallHint(false);
          }}
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}

// The service worker only exists in a production build, so dev and tests skip the hook.
export function PwaUpdate() {
  return import.meta.env.PROD ? <PwaUpdateInner /> : null;
}
