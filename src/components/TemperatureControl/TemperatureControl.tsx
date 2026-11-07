import { getImagePath } from '../../utils/assetPaths';
import styles from './TemperatureControl.module.css';

interface TemperatureControlProps {
  temperature: number;
  // Named when there are two, so each one can be told apart without seeing it.
  zone?: 'driver' | 'passenger';
  isClimateOn: boolean;
  isPanelOpen: boolean;
  onOpenPanel: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

const TemperatureControl = ({
  temperature,
  zone,
  isClimateOn,
  isPanelOpen,
  onOpenPanel,
  onIncrement,
  onDecrement,
}: TemperatureControlProps) => {
  const name = zone ? `${zone} temperature` : 'temperature';

  return (
    <div className={styles['temperature-control']}>
      <button
        type="button"
        className={`navIconWrapper ${styles['temperature-btn']}`}
        onClick={onDecrement}
      >
        <img
          className="navIcons arrows"
          src={getImagePath('icon-temp-down.svg')}
          alt={`Decrease ${name}`}
        />
      </button>
      <button
        type="button"
        className={`navIconWrapper ${styles['temperature-open']}`}
        aria-haspopup="dialog"
        aria-expanded={isPanelOpen}
        aria-label={`Climate controls, ${name} ${temperature}`}
        onClick={onOpenPanel}
      >
        <span
          className={`navIcons ${styles['temperature-display']} no-select`}
          data-off={!isClimateOn}
        >
          {temperature}
        </span>
      </button>
      <button
        type="button"
        className={`navIconWrapper ${styles['temperature-btn']}`}
        onClick={onIncrement}
      >
        <img
          className="navIcons arrows"
          src={getImagePath('icon-temp-up.svg')}
          alt={`Increase ${name}`}
        />
      </button>
    </div>
  );
};

export default TemperatureControl;
