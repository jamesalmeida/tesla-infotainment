import { useCarActions } from '../../state/CarStateContext';
import { Button, PinForm, panelStyles } from '../Apps/CarSettings/components/SystemPanel';
import styles from './DrivePinPrompt.module.css';

// Comes up over everything when PIN to Drive stops a shift out of Park.
export function DrivePinPrompt() {
  const { closeModal, resetPins, unlockDrive } = useCarActions();

  return (
    <div className={styles.prompt}>
      <h2 className={styles.title}>PIN to Drive</h2>
      <PinForm
        label="Drive PIN"
        submitLabel="Unlock"
        onSubmit={unlockDrive}
        onCancel={closeModal}
      />
      <p className={panelStyles.hint}>
        Forgot it? This is a demo with no account to recover from, so you can clear every PIN.
      </p>
      <Button onPress={resetPins}>Clear PINs</Button>
    </div>
  );
}
