import { useCallback, useEffect, useRef, useState } from 'react';
import { useDismiss } from '../../../../hooks/useDismiss';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { ChildLock, Headlights, Wipers } from '../../../../state/carState';
import { Pressable } from '../../../Pressable/Pressable';
import CarWashMode from './CarWashMode/CarWashMode';
import styles from '../CarSettings.module.css';
import { MirrorsAdjustment } from './MirrorsAdjustment';
import { SteeringAdjustment } from './SteeringAdjustment';

// Only one overlay can be open at a time, which one value guarantees.
type Overlay = 'childLock' | 'mirrors' | 'steering' | 'carWash';

const GLOVEBOX_FLASH_MS = 500;

const HEADLIGHT_MODES: { value: Headlights; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'parking', label: 'Parking' },
  { value: 'on', label: 'On' },
  { value: 'auto', label: 'Auto' },
];

const CHILD_LOCK_OPTIONS: { value: ChildLock; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
];

const WIPER_MODES: { value: Wipers; label: string }[] = [
  { value: { mode: 'off' }, label: 'Off' },
  { value: { mode: 'auto' }, label: 'Auto' },
  { value: { mode: 'manual', speed: 1 }, label: 'I' },
  { value: { mode: 'manual', speed: 2 }, label: 'II' },
  { value: { mode: 'manual', speed: 3 }, label: 'III' },
  { value: { mode: 'manual', speed: 4 }, label: 'IIII' },
];

const sameWipers = (a: Wipers, b: Wipers) =>
  a.mode === b.mode && (a.mode !== 'manual' || (b.mode === 'manual' && a.speed === b.speed));

const active = (isActive: boolean) => (isActive ? styles.active : '');

export const Controls = () => {
  const settings = useCar((state) => state.settings);
  const brightness = useCar((state) => state.display.brightness);
  const autoBrightness = useCar((state) => state.display.autoBrightness);
  const { setSettings, setDisplay } = useCarActions();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [gloveBoxClicked, setGloveBoxClicked] = useState(false);
  const childLockRef = useRef<HTMLDivElement>(null);

  const closeOverlay = useCallback(() => setOverlay(null), []);
  useDismiss(childLockRef, overlay === 'childLock', closeOverlay);

  useEffect(() => {
    if (!gloveBoxClicked) return;
    const timer = setTimeout(() => setGloveBoxClicked(false), GLOVEBOX_FLASH_MS);
    return () => clearTimeout(timer);
  }, [gloveBoxClicked]);

  const childLockLabel = CHILD_LOCK_OPTIONS.find(({ value }) => value === settings.childLock);

  return (
    <div className={styles['buttons-container']}>
      {/* Row 1 */}
      <div className={`${styles['flex-row']} ${styles['row-1']}`}>
        {HEADLIGHT_MODES.map(({ value, label }) => (
          <Pressable
            key={value}
            className={`${styles.btn} ${active(settings.headlights === value)}`}
            pressed={settings.headlights === value}
            onPress={() => setSettings({ headlights: value })}
          >
            {label}
          </Pressable>
        ))}
        <Pressable
          className={`${styles.btn} ${styles['auto-high-beams-btn']} ${active(settings.highBeams)}`}
          pressed={settings.highBeams}
          onPress={() => setSettings({ highBeams: !settings.highBeams })}
        >
          High Beams
        </Pressable>
      </div>

      <div className={styles['gap-row']}></div>

      {/* Row 2 */}
      <div className={`${styles['flex-row']} ${styles['row-2']}`}>
        <Pressable
          className={`${styles.btn} ${active(settings.foldMirrors)}`}
          pressed={settings.foldMirrors}
          onPress={() => setSettings({ foldMirrors: !settings.foldMirrors })}
        >
          Fold Mirrors
        </Pressable>
        <Pressable
          className={`${styles.btn} ${active(settings.childLock !== 'off')}`}
          onPress={() => setOverlay(overlay === 'childLock' ? null : 'childLock')}
        >
          Child Lock
          {settings.childLock !== 'off' && (
            <span className={styles.subtext}>{childLockLabel?.label}</span>
          )}
        </Pressable>
        <Pressable
          className={`${styles.btn} ${active(settings.windowLock)}`}
          pressed={settings.windowLock}
          onPress={() => setSettings({ windowLock: !settings.windowLock })}
        >
          Window Lock
        </Pressable>
      </div>

      {overlay === 'childLock' && (
        <div className={styles['child-lock-popup']} ref={childLockRef}>
          {CHILD_LOCK_OPTIONS.map(({ value, label }) => (
            <Pressable
              key={value}
              className={`${styles.btn} ${active(settings.childLock === value)}`}
              onPress={() => {
                setSettings({ childLock: value });
                closeOverlay();
              }}
            >
              {label}
            </Pressable>
          ))}
        </div>
      )}

      <div className={styles['gap-row']}></div>

      {/* Row 3 */}
      <div className={`${styles['flex-row']} ${styles['row-3']}`}>
        {WIPER_MODES.map(({ value, label }) => (
          <Pressable
            key={label}
            className={`${styles.btn} ${active(sameWipers(settings.wipers, value))}`}
            pressed={sameWipers(settings.wipers, value)}
            onPress={() => setSettings({ wipers: value })}
          >
            {label}
          </Pressable>
        ))}
      </div>

      <div className={styles['gap-row']}></div>

      {/* Row 4 */}
      <div className={`${styles['flex-row']} ${styles['row-4']}`}>
        <div className={styles['flex-column']}>
          <Pressable className={styles.btn} onPress={() => setOverlay('mirrors')}>
            Mirrors
          </Pressable>
          <Pressable className={styles.btn} onPress={() => setOverlay('steering')}>
            Steering
          </Pressable>
        </div>
        <div className={styles['gap-column']}></div>
        <div className={styles['flex-column']}>
          <Pressable
            className={`${styles.btn} ${active(settings.dashcam)}`}
            pressed={settings.dashcam}
            onPress={() => setSettings({ dashcam: !settings.dashcam })}
          >
            Dashcam
          </Pressable>
          <Pressable
            className={`${styles.btn} ${active(settings.sentry)}`}
            pressed={settings.sentry}
            onPress={() => setSettings({ sentry: !settings.sentry })}
          >
            Sentry
            {settings.sentry && <span className={styles['red-dot']}></span>}
          </Pressable>
        </div>
        <div className={styles['gap-column']}></div>
        <div className={styles['flex-column']}>
          <Pressable className={styles.btn} onPress={() => setOverlay('carWash')}>
            Car Wash
          </Pressable>
          <Pressable
            className={`${styles.btn} ${active(gloveBoxClicked)}`}
            onPress={() => setGloveBoxClicked(true)}
          >
            Glovebox
          </Pressable>
        </div>
      </div>

      {overlay === 'carWash' && (
        <div className={styles['car-wash-mode-popup']}>
          <CarWashMode onClose={closeOverlay} />
        </div>
      )}

      <div className={styles['gap-row']}></div>

      {/* Row 5 */}
      <div className={`${styles['flex-row']} ${styles['row-5']}`}>
        <div className={styles['brightness-slider']}>
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Brightness"
            value={autoBrightness ? 100 : brightness}
            onChange={(e) => setDisplay({ brightness: Number(e.target.value) })}
            disabled={autoBrightness}
          />
        </div>
        <Pressable
          className={`${styles.btn} ${styles['brightness-auto-btn']} ${active(autoBrightness)}`}
          pressed={autoBrightness}
          onPress={() => setDisplay({ autoBrightness: !autoBrightness })}
        >
          Auto
        </Pressable>
      </div>

      {overlay === 'mirrors' && (
        <div className={styles.modal}>
          <MirrorsAdjustment onClose={closeOverlay} />
        </div>
      )}
      {overlay === 'steering' && (
        <div className={styles.modal}>
          <SteeringAdjustment onClose={closeOverlay} />
        </div>
      )}
    </div>
  );
};
