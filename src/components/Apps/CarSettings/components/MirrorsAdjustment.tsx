import styles from '../CarSettings.module.css';

export const MirrorsAdjustment = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className={styles['adjustment-modal']}>
      <h2>Adjust Mirrors</h2>
      <div className={styles['adjustment-controls']}>
        <button className={styles['adjustment-btn']}>↑</button>
        <button className={styles['adjustment-btn']}>↓</button>
        <button className={styles['adjustment-btn']}>←</button>
        <button className={styles['adjustment-btn']}>→</button>
      </div>
      <button className={styles['close-btn']} onClick={onClose}>
        Close
      </button>
    </div>
  );
};
