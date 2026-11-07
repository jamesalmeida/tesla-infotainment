import { useCallback, useRef, useState } from 'react';
import { aqiLabel, weatherLabel } from '../../apps/weather';
import { useWeather } from '../../hooks/useWeather';
import { useDismiss } from '../../hooks/useDismiss';
import { useCar } from '../../state/CarStateContext';
import { formatTemperature } from '../../utils/units';
import styles from './OutsideTemp.module.css';

const SOURCE_TEXT = {
  locating: 'Finding local weather…',
  live: 'Live weather from Open-Meteo',
  sample: 'Sample weather. Allow location to see the real forecast.',
  offline: 'Sample weather. The live forecast is unavailable.',
} as const;

const OutsideTemp = () => {
  const unit = useCar((state) => state.settings.preferences.temperature);
  const { reading, status, refresh } = useWeather();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(wrapperRef, isOpen, close);

  const air = reading.aqi === null ? null : aqiLabel(reading.aqi);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.temperature} no-select`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Outside temperature ${formatTemperature(reading.temperatureF, unit)}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        {formatTemperature(reading.temperatureF, unit)}
      </button>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Weather and air quality">
          <div className={styles.heading}>
            <div>
              <p className={styles.kicker}>Outside</p>
              <strong>{weatherLabel(reading.weatherCode)}</strong>
            </div>
            <button type="button" className={styles.close} onClick={close}>
              Close
            </button>
          </div>

          <dl className={styles.readings}>
            <div>
              <dt>Now</dt>
              <dd>{formatTemperature(reading.temperatureF, unit)}</dd>
            </div>
            <div>
              <dt>High</dt>
              <dd>{formatTemperature(reading.highF, unit)}</dd>
            </div>
            <div>
              <dt>Low</dt>
              <dd>{formatTemperature(reading.lowF, unit)}</dd>
            </div>
            <div>
              <dt>Air quality</dt>
              <dd className={air ? styles[air.level] : undefined}>
                {air ? `${air.label} (${reading.aqi})` : 'Not reported'}
              </dd>
            </div>
          </dl>

          <div className={styles.footer}>
            <span>{SOURCE_TEXT[status]}</span>
            <button type="button" className={styles.refresh} onClick={refresh}>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutsideTemp;
