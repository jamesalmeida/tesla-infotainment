import styles from './LoadingSpinner.module.css';

const LoadingSpinner = () => (
  <div className={styles['loading-spinner']}>
    <div className={styles.spinner}></div>
  </div>
);

export default LoadingSpinner;
