import { useState } from 'react';
import { Callout, ui } from '../../../../apps/ui/AppScreen';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { PAINT_COLORS, WHEEL_OPTIONS } from '../../../../state/sampleData';
import styles from './PaintShop.module.css';

export function PaintShop() {
  const paint = useCar((state) => state.settings.paint);
  const wheelConfig = useCar((state) => state.settings.wheelConfig);
  const savedPlate = useCar((state) => state.settings.licensePlate);
  const { setSettings } = useCarActions();
  const [plate, setPlate] = useState(savedPlate);

  return (
    <div className={ui.stack}>
      <Callout tone="info">
        Demo only: these choices repaint the 3D car in this simulator. Nothing is sent to Tesla.
      </Callout>

      <h2 className={styles.heading}>Paint</h2>
      <div className={styles.swatches} role="group" aria-label="Paint colour">
        {PAINT_COLORS.map(({ value, label, hex }) => (
          <button
            key={value}
            type="button"
            className={`${styles.swatch} ${paint === value ? styles.selected : ''}`}
            style={{ backgroundColor: hex }}
            aria-pressed={paint === value}
            aria-label={label}
            onClick={() => setSettings({ paint: value })}
          >
            <span className={styles.swatchLabel}>{label}</span>
          </button>
        ))}
      </div>

      <h2 className={styles.heading}>Wheels</h2>
      <div className={styles.choices} role="group" aria-label="Wheel configuration">
        {WHEEL_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.choice} ${wheelConfig === value ? styles.selectedChoice : ''}`}
            aria-pressed={wheelConfig === value}
            onClick={() => setSettings({ wheelConfig: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className={styles.heading}>License plate</h2>
      <form
        className={styles.plateForm}
        onSubmit={(event) => {
          event.preventDefault();
          setSettings({ licensePlate: plate.toUpperCase().slice(0, 8) });
        }}
      >
        <label className={styles.label} htmlFor="licensePlate">
          Plate text (up to 8 characters)
        </label>
        <div className={styles.plateRow}>
          <input
            id="licensePlate"
            value={plate}
            maxLength={8}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
          />
          <button type="submit" className={styles.save}>
            Save
          </button>
        </div>
      </form>

      <p className={ui.muted}>
        Current look: {PAINT_COLORS.find(({ value }) => value === paint)?.label} paint,{' '}
        {WHEEL_OPTIONS.find(({ value }) => value === wheelConfig)?.label} wheels, plate{' '}
        {savedPlate || 'blank'}.
      </p>
    </div>
  );
}
