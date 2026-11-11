import { useEffect, useState } from 'react';
import { useCarActions } from '../../state/CarStateContext';
import styles from './Emergency.module.css';

const DEMO_CALL_SECONDS = 4;

// Deliberately a simulation. It says so, and the call button never dials anything.
export function Emergency() {
  const { closeModal, showNotice } = useCarActions();
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    if (callSeconds <= 0) return;
    const timer = setTimeout(() => setCallSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [callSeconds]);

  const startDemoCall = () => {
    setCallSeconds(DEMO_CALL_SECONDS);
    showNotice('Demo SOS: no one is being called');
  };

  return (
    <div className={styles.emergency}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>Emergency</p>
          <h1 className={styles.title}>SOS</h1>
        </div>
        <button type="button" className={styles.close} onClick={closeModal}>
          Close
        </button>
      </div>

      <p className={styles.demo} role="note">
        Demo only. This screen explains what SOS would do; nothing is actually dialled.
      </p>

      <div className={styles.callBox}>
        <button type="button" className={styles.callButton} onClick={startDemoCall}>
          {callSeconds > 0 ? `Demo call ${callSeconds}` : 'Start demo call'}
        </button>
        <p>
          {callSeconds > 0
            ? 'Pretend help is on the way. This is not a real emergency call.'
            : 'In a real car, SOS connects to emergency services and shares the car’s location.'}
        </p>
      </div>

      <ul className={styles.list}>
        <li>Press SOS to call emergency services.</li>
        <li>The car sends its location to the operator.</li>
        <li>A red light shows the call is connected.</li>
        <li>Roadside assistance can be reached separately.</li>
      </ul>
    </div>
  );
}
