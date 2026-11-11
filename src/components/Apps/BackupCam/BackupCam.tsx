import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { safeStorage } from '../../../utils/safeStorage';
import styles from './BackupCam.module.css';

export type Rotation = 0 | 90 | 180 | 270;

const ROTATION_KEY = 'tesla-camera-rotation';

/**
 * Some devices hand the browser camera frames turned a quarter turn from the screen. The
 * iPhone Duo does when unfolded, because it reports the outer panel's portrait shape while
 * the inner screen is landscape. So a portrait frame in a landscape window, on a touch device,
 * is treated as turned and stood back up. Nothing else is guessed at: a laptop's camera always
 * matches its screen, and anything unusual can be turned with the rotate button.
 */
export const autoRotation = (
  frame: { width: number; height: number },
  windowIsPortrait: boolean,
  isTouch: boolean,
): Rotation => {
  if (!isTouch || windowIsPortrait || frame.width === 0 || frame.height === 0) return 0;
  return frame.height > frame.width ? 90 : 0;
};

export const nextRotation = (rotation: Rotation): Rotation => ((rotation + 90) % 360) as Rotation;

const readSavedRotation = (): Rotation | null => {
  const saved = Number(safeStorage.getItem(ROTATION_KEY));
  return [0, 90, 180, 270].includes(saved) && safeStorage.getItem(ROTATION_KEY) !== null
    ? (saved as Rotation)
    : null;
};

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
  const webcamRef = useRef<Webcam>(null);
  // A turn the driver picked wins; otherwise the frame's own shape decides.
  const [savedRotation, setSavedRotation] = useState<Rotation | null>(readSavedRotation);
  const [detectedRotation, setDetectedRotation] = useState<Rotation>(0);
  const rotation = savedRotation ?? detectedRotation;

  useEffect(() => {
    if (cameraState !== 'streaming') return;
    const video = webcamRef.current?.video;
    if (!video) return;
    const portrait = window.matchMedia('(orientation: portrait)');
    const touch = window.matchMedia('(pointer: coarse)');
    const detect = () =>
      setDetectedRotation(
        autoRotation(
          { width: video.videoWidth, height: video.videoHeight },
          portrait.matches,
          touch.matches,
        ),
      );
    detect();
    // The frame size changes when the device turns or folds.
    video.addEventListener('resize', detect);
    portrait.addEventListener('change', detect);
    return () => {
      video.removeEventListener('resize', detect);
      portrait.removeEventListener('change', detect);
    };
  }, [cameraState]);

  const rotate = () => {
    const next = nextRotation(rotation);
    safeStorage.setItem(ROTATION_KEY, String(next));
    setSavedRotation(next);
  };

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
        // The turn goes on a wrapper: the video's own transform is the mirroring.
        <div className={styles.rotator} data-rotation={rotation}>
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={videoConstraints}
            mirrored={true}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            style={{ display: cameraState === 'streaming' ? 'block' : 'none' }}
          />
        </div>
      )}
      {cameraState === 'streaming' && (
        <button
          type="button"
          className={styles.rotateButton}
          aria-label="Rotate camera"
          onClick={rotate}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
