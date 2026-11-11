import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './PwaUpdate.module.css';

const OFFLINE_READY_MS = 5000;

function PwaUpdateInner() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

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

  return null;
}

// The service worker only exists in a production build, so dev and tests skip the hook.
export function PwaUpdate() {
  return import.meta.env.PROD ? <PwaUpdateInner /> : null;
}
