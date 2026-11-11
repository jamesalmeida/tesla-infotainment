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

const canRequestFullscreen = () =>
  Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);

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
    if (!visible) return;
    const onChange = () => {
      if (isFullscreen()) setVisible(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [visible]);

  const dismiss = () => {
    safeStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const goFullscreen = () => {
    const request = document.documentElement.requestFullscreen;
    if (!request) {
      dismiss();
      return;
    }
    request
      .call(document.documentElement)
      .then(dismiss)
      .catch(() => {
        // iOS Safari on iPhone has no element full screen; the hint still helps.
        dismiss();
      });
  };

  if (!visible) return null;

  const supported = canRequestFullscreen();

  return (
    <div className={styles.banner} role="note">
      <span>
        {supported
          ? 'Use full screen to give the display more room.'
          : 'Add to Home Screen for a full-screen display.'}
      </span>
      <button type="button" onClick={supported ? goFullscreen : dismiss}>
        {supported ? 'Full screen' : 'Got it'}
      </button>
      {supported && (
        <button type="button" className={styles.dismiss} onClick={dismiss}>
          Later
        </button>
      )}
    </div>
  );
}
