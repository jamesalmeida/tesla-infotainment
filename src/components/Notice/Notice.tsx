import { useEffect } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type { Notice as NoticeData } from '../../state/carState';
import styles from './Notice.module.css';

const NOTICE_MS = 3000;

function Toast({ toast }: { toast: NoticeData }) {
  const { dismissNotice } = useCarActions();

  // Each toast has its own clock, so a new one doesn't keep the older ones on screen.
  useEffect(() => {
    const timer = setTimeout(() => dismissNotice(toast.id), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismissNotice]);

  return (
    <button type="button" className={styles.notice} onClick={() => dismissNotice(toast.id)}>
      {toast.message}
    </button>
  );
}

// Short messages for things the car refused to do, or did on its own.
export function Notice() {
  const toasts = useCar((state) => state.toasts);

  return (
    <div className={styles.stack} role="status">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
