import styles from '../CarSettings.module.css';

export const SteeringAdjustment = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className={styles['adjustment-modal']}>
      <h2>Adjust Steering Wheel</h2>
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
