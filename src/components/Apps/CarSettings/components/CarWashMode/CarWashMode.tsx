import styles from './CarWashMode.module.css';

export default function CarWashMode({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles['car-wash-mode-container']}>
      <div className="car-wash-mode-header">
        <div className={styles['car-wash-mode-title']}>Car Wash Mode</div>
        <div className="car-wash-mode-content">Coming Soon</div>
        <div className="close-button ctaBtn" onClick={onClose}>
          Exit Car Wash Mode
        </div>
      </div>
    </div>
  );
}
