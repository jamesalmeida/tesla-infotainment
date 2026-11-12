import { useSyncExternalStore } from 'react';

// Safari's older full-screen path is prefixed, so every helper here tries both.
type PrefixedDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type PrefixedElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const prefixedDocument = () => document as PrefixedDocument;
const root = () => document.documentElement as PrefixedElement;

// Opened from the Home Screen: the browser's bars are already gone.
export const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isFullscreen = (): boolean =>
  Boolean(document.fullscreenElement ?? prefixedDocument().webkitFullscreenElement);

// Safari on iPhone has no element full screen; iPad Safari and desktop browsers do.
export const canRequestFullscreen = (): boolean => {
  const element = root();
  return Boolean(
    (document.fullscreenEnabled && element.requestFullscreen) || element.webkitRequestFullscreen,
  );
};

// Resolves true once the page is full screen, and false where the browser can't or won't.
export const requestFullscreen = async (): Promise<boolean> => {
  const element = root();
  try {
    if (document.fullscreenEnabled && element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: 'hide' });
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else {
      return false;
    }
  } catch {
    return false;
  }
  return true;
};

export const exitFullscreen = async (): Promise<void> => {
  const doc = prefixedDocument();
  try {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen)
      await doc.webkitExitFullscreen();
  } catch {
    // Already out of full screen.
  }
};

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
};

export const useIsFullscreen = (): boolean => useSyncExternalStore(subscribe, isFullscreen);
