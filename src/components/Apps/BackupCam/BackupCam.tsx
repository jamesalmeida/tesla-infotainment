import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export interface CameraOption {
  id: string;
  label: string;
}

// Safari can only run one camera at a time, so the extra ones become choices rather than
// extra streams. Devices without an id can't be selected, so they're left out.
export const cameraOptions = (
  devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[],
): CameraOption[] =>
  devices
    .filter((device) => device.kind === 'videoinput' && device.deviceId)
    .map((device) => ({ id: device.deviceId, label: device.label || 'Camera' }));

export const nextCamera = (
  cameras: CameraOption[],
  currentId: string | null,
): CameraOption | null => {
  if (cameras.length < 2) return null;
  const index = cameras.findIndex((camera) => camera.id === currentId);
  return cameras[(index + 1) % cameras.length] ?? cameras[0] ?? null;
};

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
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [activeCamera, setActiveCamera] = useState<CameraOption | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<string | null>(null);
  const rotation = savedRotation ?? detectedRotation;

  const constraints = useMemo(
    () =>
      selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : videoConstraints,
    [selectedDeviceId],
  );

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const options = cameraOptions(devices);
      setCameras(options);
      const track = webcamRef.current?.stream?.getVideoTracks()[0];
      const settings = track?.getSettings();
      const id = settings?.deviceId ?? '';
      const label = track?.label ?? '';
      const current =
        options.find((camera) => camera.id === id) ||
        options.find((camera) => camera.label === label) ||
        null;
      if (current) setActiveCamera(current);
      setFacingMode(settings?.facingMode ?? null);
    } catch {
      // Enumeration is a nicety; the camera still works without it.
    }
  }, []);

  useEffect(() => {
    if (cameraState !== 'streaming') return;
    void refreshCameras();
  }, [cameraState, refreshCameras]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;
    const onChange = () => void refreshCameras();
    mediaDevices.addEventListener('devicechange', onChange);
    return () => mediaDevices.removeEventListener('devicechange', onChange);
  }, [refreshCameras]);

  useEffect(() => {
    if (cameraState !== 'streaming') return;
    const video = webcamRef.current?.video;
    if (!video) return;

    const detect = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      setDetectedRotation(
        autoRotation(
          { width: video.videoWidth, height: video.videoHeight },
          window.innerHeight > window.innerWidth,
          navigator.maxTouchPoints > 0,
        ),
      );
    };

    // The frame size can arrive after the stream starts, and it changes when the device
    // turns or folds, so retry and listen rather than guessing once.
    const timers = [0, 250, 1000].map((ms) => setTimeout(detect, ms));
    video.addEventListener('loadedmetadata', detect);
    video.addEventListener('resize', detect);
    window.addEventListener('resize', detect);
    window.addEventListener('orientationchange', detect);
    screen.orientation?.addEventListener?.('change', detect);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      video.removeEventListener('loadedmetadata', detect);
      video.removeEventListener('resize', detect);
      window.removeEventListener('resize', detect);
      window.removeEventListener('orientationchange', detect);
      screen.orientation?.removeEventListener?.('change', detect);
    };
  }, [cameraState, selectedDeviceId]);

  const rotate = () => {
    const next = nextRotation(rotation);
    safeStorage.setItem(ROTATION_KEY, String(next));
    setSavedRotation(next);
  };

  const switchCamera = () => {
    const next = nextCamera(cameras, activeCamera?.id ?? null);
    if (!next) return;
    setSelectedDeviceId(next.id);
    setDetectedRotation(0);
    setCameraState('requesting');
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
            videoConstraints={constraints}
            mirrored={facingMode === 'user'}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            style={{ display: cameraState === 'streaming' ? 'block' : 'none' }}
          />
        </div>
      )}
      {cameraState === 'streaming' && (
        <>
          {cameras.length > 1 && (
            <button
              type="button"
              className={styles.switchButton}
              aria-label="Switch camera"
              title={activeCamera?.label ?? 'Switch camera'}
              onClick={switchCamera}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v10H4z" />
                <path d="M9 13a3 3 0 0 0 5.5 1.7M15 13a3 3 0 0 0-5.5-1.7" />
                <path d="M15 10.5V13h-2.5M9 15.5V13h2.5" />
              </svg>
            </button>
          )}
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
        </>
      )}
    </div>
  );
}
