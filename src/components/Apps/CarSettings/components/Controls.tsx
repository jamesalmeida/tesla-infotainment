import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../../../../hooks/useDismiss';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  canAdjustSteering,
  dashcamState,
  sentryState,
  type CarState,
  type ChildLock,
  type DashcamMode,
  type DashcamState,
  type Headlights,
  type SentryState,
  type Wipers,
} from '../../../../state/carState';
import { Pressable } from '../../../Pressable/Pressable';
import styles from '../CarSettings.module.css';
import { MirrorsAdjustment } from './MirrorsAdjustment';
import { ActionButton, ActionRow, Section, Segmented, type Choice } from './SettingsKit';
import { SteeringAdjustment } from './SteeringAdjustment';

// Only one overlay can be open at a time, which one value guarantees.
type Overlay = 'childLock' | 'mirrors' | 'steering';

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

const DASHCAM_MODES: Choice<DashcamMode>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manual' },
  { value: 'honk', label: 'On Honk' },
];

const DASHCAM_LABELS: Record<DashcamState, string> = {
  off: 'Off',
  paused: 'On, paused while parked',
  recording: 'Recording',
};

const DASHCAM_MODE_NOTES: Record<DashcamMode, string> = {
  auto: 'Records whenever the car is out of Park, and for Sentry.',
  manual: 'Records for as long as the dashcam is on.',
  honk: 'Records like Auto. The horn saves the last few minutes.',
};

const SENTRY_LABELS: Record<SentryState, string> = {
  off: 'Off',
  standby: 'Standby: watching the car',
  alarm: 'Alarm',
};

const steeringRefusal = (state: CarState) => {
  const permission = canAdjustSteering(state);
  return permission.allowed ? null : permission.reason;
};

const sameWipers = (a: Wipers, b: Wipers) =>
  a.mode === b.mode && (a.mode !== 'manual' || (b.mode === 'manual' && a.speed === b.speed));

const active = (isActive: boolean) => (isActive ? styles.active : '');

function DashcamSection() {
  const status = useCar(dashcamState);
  const mode = useCar((state) => state.settings.dashcamMode);
  const clips = useCar((state) => state.dashcamClips.length);
  const { saveDashcamClip, setSettings } = useCarActions();

  return (
    <Section title="Dashcam">
      <Segmented
        setting="dashcam-mode"
        label="Recording Mode"
        description={DASHCAM_MODE_NOTES[mode]}
        value={mode}
        options={DASHCAM_MODES}
        onChange={(dashcamMode) => setSettings({ dashcamMode })}
      />
      <ActionRow
        setting="dashcam-status"
        label={DASHCAM_LABELS[status]}
        description={`${clips} saved ${clips === 1 ? 'clip' : 'clips'}`}
      >
        {mode === 'honk' ? (
          <ActionButton onClick={() => saveDashcamClip('honk')}>Sound Horn</ActionButton>
        ) : (
          <ActionButton onClick={() => saveDashcamClip('manual')}>Save Clip</ActionButton>
        )}
      </ActionRow>
    </Section>
  );
}

function SentrySection() {
  const status = useCar(sentryState);
  const isSettingOn = useCar((state) => state.settings.sentry);
  const { triggerSentryAlarm } = useCarActions();

  return (
    <Section title="Sentry Mode">
      <ActionRow
        setting="sentry-status"
        label={SENTRY_LABELS[status]}
        description={
          isSettingOn && status === 'off' ? 'Starts watching when you shift to Park.' : undefined
        }
      >
        <ActionButton disabled={status !== 'standby'} onClick={triggerSentryAlarm}>
          Simulate a Break-In
        </ActionButton>
      </ActionRow>
    </Section>
  );
}

export const Controls = () => {
  const settings = useCar((state) => state.settings);
  const brightness = useCar((state) => state.display.brightness);
  const autoBrightness = useCar((state) => state.display.autoBrightness);
  const dashcamOn = useCar((state) => dashcamState(state) === 'recording');
  const isGloveboxOpen = useCar((state) => state.gloveboxOpen);
  const steeringBlocked = useCar(steeringRefusal);
  const { enterMode, setDisplay, setSettings, showNotice, toggleGlovebox } = useCarActions();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const childLockRef = useRef<HTMLDivElement>(null);

  const closeOverlay = useCallback(() => setOverlay(null), []);
  useDismiss(childLockRef, overlay === 'childLock', closeOverlay);

  const childLockLabel = CHILD_LOCK_OPTIONS.find(({ value }) => value === settings.childLock);

  return (
    <div className={styles['buttons-container']}>
      {/* Row 1 */}
      <div className={`${styles['flex-row']} ${styles['row-1']}`}>
        {HEADLIGHT_MODES.map(({ value, label }) => (
          <Pressable
            key={value}
            data-setting={value === 'off' ? 'headlights' : undefined}
            className={`${styles.btn} ${active(settings.headlights === value)}`}
            pressed={settings.headlights === value}
            onPress={() => setSettings({ headlights: value })}
          >
            {label}
          </Pressable>
        ))}
        <Pressable
          data-setting="high-beams"
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
          data-setting="fold-mirrors"
          className={`${styles.btn} ${active(settings.foldMirrors)}`}
          pressed={settings.foldMirrors}
          onPress={() => setSettings({ foldMirrors: !settings.foldMirrors })}
        >
          Fold Mirrors
        </Pressable>
        <Pressable
          data-setting="child-lock"
          className={`${styles.btn} ${active(settings.childLock !== 'off')}`}
          onPress={() => setOverlay(overlay === 'childLock' ? null : 'childLock')}
        >
          Child Lock
          {settings.childLock !== 'off' && (
            <span className={styles.subtext}>{childLockLabel?.label}</span>
          )}
        </Pressable>
        <Pressable
          data-setting="window-lock"
          className={`${styles.btn} ${active(settings.windowLock)}`}
          pressed={settings.windowLock}
          onPress={() => setSettings({ windowLock: !settings.windowLock })}
        >
          Window Lock
        </Pressable>
        <Pressable
          data-setting="vent-windows"
          className={`${styles.btn} ${active(settings.windowsVented)}`}
          pressed={settings.windowsVented}
          onPress={() => setSettings({ windowsVented: !settings.windowsVented })}
        >
          {settings.windowsVented ? 'Close Windows' : 'Vent Windows'}
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
            data-setting={label === 'Off' ? 'wipers' : undefined}
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
          <Pressable
            data-setting="mirrors"
            className={styles.btn}
            onPress={() => setOverlay('mirrors')}
          >
            Mirrors
          </Pressable>
          <Pressable
            data-setting="steering-wheel"
            className={styles.btn}
            onPress={() => (steeringBlocked ? showNotice(steeringBlocked) : setOverlay('steering'))}
          >
            Steering
          </Pressable>
        </div>
        <div className={styles['gap-column']}></div>
        <div className={styles['flex-column']}>
          <Pressable
            data-setting="dashcam"
            className={`${styles.btn} ${active(settings.dashcam)}`}
            pressed={settings.dashcam}
            onPress={() => setSettings({ dashcam: !settings.dashcam })}
          >
            Dashcam
            {dashcamOn && <span className={styles['red-dot']}></span>}
          </Pressable>
          <Pressable
            data-setting="sentry"
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
          <Pressable
            data-setting="car-wash"
            className={styles.btn}
            onPress={() => enterMode('car-wash')}
          >
            Car Wash
          </Pressable>
          <Pressable
            data-setting="glovebox"
            className={`${styles.btn} ${active(isGloveboxOpen)}`}
            pressed={isGloveboxOpen}
            onPress={toggleGlovebox}
          >
            Glovebox
            {isGloveboxOpen && <span className={styles.subtext}>Open</span>}
          </Pressable>
        </div>
      </div>

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
      {overlay === 'steering' && !steeringBlocked && (
        <div className={styles.modal}>
          <SteeringAdjustment onClose={closeOverlay} />
        </div>
      )}

      <div className={styles['controls-sections']}>
        <DashcamSection />
        <SentrySection />
      </div>
    </div>
  );
};
