import { getImagePath } from '../../utils/assetPaths';
import styles from './Climate.module.css';

// The icons are drawn in one light colour for the dark dock. As a mask they take the text
// colour instead, so they stay visible on a light panel.
export function Glyph({ icon }: { icon: string }) {
  return (
    <span
      className={styles.glyph}
      style={{ maskImage: `url(${getImagePath(icon)})` }}
      aria-hidden="true"
    />
  );
}
