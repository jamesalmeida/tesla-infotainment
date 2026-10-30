import styles from '../CarSettings.module.css';

export const Autopilot = () => {
  return (
    <div className={styles['buttons-container']}>
      <div className="label">Autopilot</div>
      <div className={`${styles['flex-row']} ${styles['row-1']}`}>
        <div className={styles.btn}>Button</div>
      </div>
      <div className="description">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut purus eget sapien. Sed ut
        purus eget sapien.
      </div>
      <div className={styles['gap-row']}></div>
      <div className={`${styles['flex-row']} ${styles['row-2']}`}>
        <div className={styles.btn}>Button</div>
      </div>
    </div>
  );
};
