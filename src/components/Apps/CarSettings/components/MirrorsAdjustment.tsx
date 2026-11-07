import { useEffect, useState } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import styles from '../CarSettings.module.css';
import { AdjustmentPad } from './AdjustmentPad';

type Mirror = 'mirrorLeft' | 'mirrorRight';

const MIRRORS: { value: Mirror; label: string }[] = [
  { value: 'mirrorLeft', label: 'Left Mirror' },
  { value: 'mirrorRight', label: 'Right Mirror' },
];

export const MirrorsAdjustment = ({ onClose }: { onClose: () => void }) => {
  const [mirror, setMirror] = useState<Mirror>('mirrorLeft');
  const value = useCar((state) => state.settings[mirror]);
  const { setSettings } = useCarActions();

  // A folded mirror can't be aimed, so adjustment mode opens them out first.
  useEffect(() => setSettings({ foldMirrors: false }), [setSettings]);

  return (
    <AdjustmentPad
      title="Adjust Mirrors"
      value={value}
      onChange={(next) => setSettings({ [mirror]: next })}
      onClose={onClose}
    >
      <div className={styles['adjustment-sides']}>
        {MIRRORS.map(({ value: side, label }) => (
          <button
            key={side}
            type="button"
            className={side === mirror ? styles.active : ''}
            aria-pressed={side === mirror}
            onClick={() => setMirror(side)}
          >
            {label}
          </button>
        ))}
      </div>
    </AdjustmentPad>
  );
};
