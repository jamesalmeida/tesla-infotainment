import { useDots } from '../../utils/dots';
import styles from './ErrorScreen.module.css';

const circular = styles['-circular'];

export default function ErrorScreen() {
  const dots = useDots();

  return (
    <div id="page" className={styles.errorScreen}>
      <div className={styles.hal}>
        <div className={`${styles['hal-eye']} ${circular}`}>
          <div className={`${styles.__ring} ${circular}`}></div>
          <div className={`${styles.__oculus} ${circular}`}>
            <div className={`${styles.__iris} ${circular} ${styles['-narrow']}`}></div>
            <div className={`${styles.__iris} ${circular} ${styles['-wide']}`}></div>
            <div className={`${styles.__highlight} ${styles['-alpha']}`}></div>
            <div className={`${styles.__highlight} -beta`}></div>
            <div className={`${styles.__highlight} ${styles['-gamma']}`}></div>
          </div>
        </div>
        <div className={styles['error-message']}>
          I'm sorry, Dave. I'm afraid I can't do that{dots}
        </div>
      </div>
    </div>
  );
}
