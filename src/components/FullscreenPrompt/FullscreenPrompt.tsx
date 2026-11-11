import { useEffect, useState } from 'react';
import { safeStorage } from '../../utils/safeStorage';
import styles from './FullscreenPrompt.module.css';

const DISMISSED_KEY = 'tesla-fullscreen-dismissed';
const SMALL_WIDTH = 1024;
const SMALL_HEIGHT = 768;

interface PromptConditions {
  isTouch: boolean;
  isStandalone: boolean;
  isFullscreen: boolean;
  dismissed: boolean;
  width: number;
  height: number;
}

// A phone or small tablet is where the browser's own bars cost the most room. Larger touch
// screens and desktops have enough space, and an installed app is already full screen.
export const shouldPromptFullscreen = ({
  isTouch,
  isStandalone,
  isFullscreen,
  dismissed,
  width,
  height,
}: PromptConditions): boolean =>
  isTouch &&
  !isStandalone &&
  !isFullscreen &&
  !dismissed &&
  (width <= SMALL_WIDTH || height <= SMALL_HEIGHT);

const isTouchDevice = () => navigator.maxTouchPoints > 0;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isFullscreen = () => Boolean(document.fullscreenElement);

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

// Safari's older full-screen path is prefixed, so try both.
const requestBrowserFullscreen = (): Promise<void> | null => {
  const element = document.documentElement as FullscreenElement;
  if (document.fullscreenEnabled && element.requestFullscreen) {
    return element.requestFullscreen();
  }
  if (element.webkitRequestFullscreen) {
    return Promise.resolve(element.webkitRequestFullscreen());
  }
  return null;
};

const canRequestFullscreen = () => {
  const element = document.documentElement as FullscreenElement;
  return Boolean(
    (document.fullscreenEnabled && element.requestFullscreen) || element.webkitRequestFullscreen,
  );
};

// Where the browser has no full-screen API, the app fills the viewport itself instead.
const enterImmersive = () => {
  document.documentElement.dataset.fullscreen = 'true';
};

const exitImmersive = () => {
  delete document.documentElement.dataset.fullscreen;
};

export function FullscreenPrompt() {
  const [visible, setVisible] = useState(() =>
    shouldPromptFullscreen({
      isTouch: isTouchDevice(),
      isStandalone: isStandalone(),
      isFullscreen: isFullscreen(),
      dismissed: safeStorage.getItem(DISMISSED_KEY) === '1',
      width: window.innerWidth,
      height: window.innerHeight,
    }),
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      if (isFullscreen()) setVisible(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitImmersive();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const dismiss = () => {
    safeStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const goFullscreen = () => {
    const request = requestBrowserFullscreen();
    if (!request) {
      enterImmersive();
      dismiss();
      return;
    }
    request.then(dismiss).catch(() => {
      // iOS Safari on iPhone has no element full screen; fill the viewport instead.
      enterImmersive();
      dismiss();
    });
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="note">
      <p className={styles.message}>
        {canRequestFullscreen()
          ? 'Use full screen to give the display more room.'
          : 'Go full screen now, or add the app to your Home Screen.'}
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={goFullscreen}>
          Full screen
        </button>
        <button type="button" className={styles.dismiss} onClick={dismiss}>
          Later
        </button>
      </div>
    </div>
  );
}
