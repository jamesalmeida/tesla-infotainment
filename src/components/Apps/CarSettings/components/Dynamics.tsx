import styles from '../CarSettings.module.css';

export const Dynamics = () => {
  return (
    <div className={styles['buttons-container']}>
      <div className="label">Acceleration</div>
      <div className={`${styles['flex-row']} ${styles['row-1']}`}>
        <div className={styles.btn}>Chill</div>
        <div className={styles.btn}>Sport</div>
      </div>

      <div className={styles['gap-row']}></div>

      <div className="label">Steering Weight</div>
      <div className={`${styles['flex-row']} ${styles['row-2']}`}>
        <div className={styles.btn}>Light</div>
        <div className={styles.btn}>Standard</div>
        <div className={styles.btn}>Heavy</div>
      </div>

      <div className={styles['gap-row']}></div>

      <div className="label">Track Mode</div>
      <div className={`${styles['flex-row']} ${styles['row-3']}`}>
        <div className={styles.btn}>Customize</div>
      </div>

      <div className={styles['gap-row']}></div>

      <div className="label">Stopping Mode</div>
      <div className={`${styles['flex-row']} ${styles['row-3']}`}>
        <div className={styles.btn}>Creep</div>
        <div className={styles.btn}>Roll</div>
        <div className={styles.btn}>Hold</div>
      </div>
      <div className="description">
        Maximizos range by extending regenerative braking to lower speeds and automatically blonde
        in brakes to hold the vehiole at a stop
      </div>

      <div className={styles['gap-row']}></div>

      <div className={`${styles['flex-row']} ${styles['row-5']}`}>
        <div className={styles.btn}>On/Off Toggle</div>
      </div>
      <div className="label">Apply brakes when regenerative braking is limited.</div>

      <div className={styles['gap-row']}></div>

      <div className={`${styles['flex-row']} ${styles['row-5']}`}>
        <div className={styles.btn}>On/Off Toggle</div>
      </div>
      <div className="label">Off Road Assist.</div>

      <div className={styles['gap-row']}></div>

      <div className={`${styles['flex-row']} ${styles['row-5']}`}>
        <div className={styles.btn}>On/Off Toggle</div>
      </div>
      <div className={styles['gap-row']}></div>

      <div className="label">Slip Start</div>
      <div className="description">Use to help free vehicle stuck in snow, sand, or mud.</div>
    </div>
  );
};
