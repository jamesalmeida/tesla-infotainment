import { getImagePath } from '../../utils/assetPaths';
import styles from './TemperatureControl.module.css';

interface TemperatureControlProps {
  temperature: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const TemperatureControl = ({ temperature, onIncrement, onDecrement }: TemperatureControlProps) => (
  <div className={styles['temperature-control']}>
    <img
      className={`navIcons arrows`}
      src={getImagePath('icon-temp-down.svg')}
      alt="Decrease temperature"
      onClick={onDecrement}
    />
    <span className={`navIcons ${styles['temperature-display']} no-select`}>{temperature}</span>
    <img
      className={`navIcons arrows`}
      src={getImagePath('icon-temp-up.svg')}
      alt="Increase temperature"
      onClick={onIncrement}
    />
  </div>
);

export default TemperatureControl;
