import { useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import styles from './BackupCam.module.css';

export type CameraState = 'requesting' | 'streaming' | 'denied' | 'unavailable' | 'error';

// Ideal rather than min, so a smaller camera is used instead of failing outright.
const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: { ideal: 'environment' },
};

export const cameraStateForError = (error: string | DOMException): CameraState => {
  const name = typeof error === 'string' ? error : error.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'unavailable';
  return 'error';
};

const MESSAGES: Partial<Record<CameraState, { title: string; detail: string }>> = {
  requesting: { title: 'Starting camera...', detail: 'Allow camera access to see behind you.' },
  denied: {
    title: 'Camera access is off',
    detail: 'Allow the camera in your browser settings to use the backup view.',
  },
  unavailable: {
    title: 'No camera found',
    detail: 'This device has no camera, so there is no rear view to show.',
  },
  error: {
    title: "The camera couldn't start",
    detail: 'Another app may be using it. Shift out of Reverse and try again.',
  },
};

export function BackupCam() {
  const [cameraState, setCameraState] = useState<CameraState>('requesting');

  const handleUserMedia = useCallback(() => setCameraState('streaming'), []);
  const handleUserMediaError = useCallback((error: string | DOMException) => {
    setCameraState(cameraStateForError(error));
  }, []);

  const message = MESSAGES[cameraState];
  const isFailed = cameraState !== 'requesting' && cameraState !== 'streaming';

  return (
    <div className={styles.cameraWrapper}>
      {message && (
        <div className={styles.placeholder} role={isFailed ? 'alert' : 'status'}>
          <p className={styles.placeholderTitle}>{message.title}</p>
          <p>{message.detail}</p>
        </div>
      )}
      {!isFailed && (
        <Webcam
          audio={false}
          videoConstraints={videoConstraints}
          mirrored={true}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          style={{ display: cameraState === 'streaming' ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}
