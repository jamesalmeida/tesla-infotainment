import { useCar } from '../../state/CarStateContext';
import styles from './BrightnessOverlay.module.css';

// The dimmest the screen goes, so it can never become unreadable.
const MIN_BRIGHTNESS = 10;

export const effectiveBrightness = (brightness: number, auto: boolean) =>
  auto ? 100 : Math.max(MIN_BRIGHTNESS, brightness);

// Dims like a backlight: a black layer over the content, not transparency on the content.
export function BrightnessOverlay() {
  const brightness = useCar((state) => state.display.brightness);
  const auto = useCar((state) => state.display.autoBrightness);
  const opacity = 1 - effectiveBrightness(brightness, auto) / 100;

  return <div className={styles.brightnessOverlay} style={{ opacity }} aria-hidden="true" />;
}
