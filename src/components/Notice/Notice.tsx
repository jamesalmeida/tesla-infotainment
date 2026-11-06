import { useEffect } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import styles from './Notice.module.css';

const NOTICE_MS = 3000;

// A short message for things the car refused to do, or did on its own.
export function Notice() {
  const notice = useCar((state) => state.notice);
  const { dismissNotice } = useCarActions();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  if (!notice) return null;

  return (
    <div className={styles.notice} role="status">
      {notice.message}
    </div>
  );
}
