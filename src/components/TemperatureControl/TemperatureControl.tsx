import { getImagePath } from '../../utils/assetPaths';
import styles from './TemperatureControl.module.css';

interface TemperatureControlProps {
  temperature: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const TemperatureControl = ({ temperature, onIncrement, onDecrement }: TemperatureControlProps) => (
  <div className={styles['temperature-control']}>
    <button
      type="button"
      className={`navIconWrapper ${styles['temperature-btn']}`}
      onClick={onDecrement}
    >
      <img
        className="navIcons arrows"
        src={getImagePath('icon-temp-down.svg')}
        alt="Decrease temperature"
      />
    </button>
    <span className={`navIcons ${styles['temperature-display']} no-select`}>{temperature}</span>
    <button
      type="button"
      className={`navIconWrapper ${styles['temperature-btn']}`}
      onClick={onIncrement}
    >
      <img
        className="navIcons arrows"
        src={getImagePath('icon-temp-up.svg')}
        alt="Increase temperature"
      />
    </button>
  </div>
);

export default TemperatureControl;
