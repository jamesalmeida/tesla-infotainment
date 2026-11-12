import { isStandalone } from './fullscreen';

interface Measures {
  standalone: boolean;
  innerWidth: number;
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * The height the app should fill, or null to let the viewport decide. Opened from the Home
 * Screen, an iPad lays the page out shorter than the screen (by the home-indicator strip), so
 * "the viewport" leaves a gap under the dock. An installed app owns the whole screen, so the
 * screen's own height is the right one. iOS reports the screen in portrait whichever way it is
 * held, so the shorter side is the height in landscape.
 */
export function appHeight({
  standalone,
  innerWidth,
  innerHeight,
  screenWidth,
  screenHeight,
}: Measures): number | null {
  if (!standalone || screenWidth <= 0 || screenHeight <= 0) return null;
  const landscape = innerWidth > innerHeight;
  const screenTall = landscape
    ? Math.min(screenWidth, screenHeight)
    : Math.max(screenWidth, screenHeight);
  return Math.max(innerHeight, screenTall);
}

const sync = () => {
  const height = appHeight({
    standalone: isStandalone(),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });
  const style = document.documentElement.style;
  if (height === null) style.removeProperty('--app-height');
  else style.setProperty('--app-height', `${height}px`);
};

/** Keeps --app-height in step with rotation and resizing. */
export function trackAppHeight() {
  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
}
