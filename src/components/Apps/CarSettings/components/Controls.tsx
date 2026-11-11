import { useCallback, useRef, useState, type ReactNode } from 'react';
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
import {
  CameraIcon,
  CarWashIcon,
  ChildLockIcon,
  FoldMirrorIcon,
  GloveboxIcon,
  HighBeamIcon,
  MirrorAdjustIcon,
  SentryIcon,
  SteeringAdjustIcon,
  SunIcon,
  VentWindowIcon,
  WindowLockIcon,
  WiperIcon,
} from './ControlIcons';
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

interface TileProps {
  setting?: string;
  icon: ReactNode;
  label: ReactNode;
  // A second, smaller line, such as which doors a child lock covers.
  sub?: ReactNode;
  isOn?: boolean;
  pressed?: boolean;
  // The car marks a camera that is recording with a red dot on its icon.
  dot?: boolean;
  onPress: () => void;
}

// A tile as the car draws it: icon above a short label. Blue only while what it switches is on.
function Tile({ setting, icon, label, sub, isOn = false, pressed, dot, onPress }: TileProps) {
  return (
    <Pressable
      data-setting={setting}
      className={`${styles.tile} ${active(isOn)}`}
      pressed={pressed}
      onPress={onPress}
    >
      <span className={styles['tile-icon']}>
        {icon}
        {dot && <span className={styles['red-dot']}></span>}
      </span>
      {/* Bare text, not wrapped, so the tile itself is what carries the label's text. */}
      {label}
      {sub && <span className={styles.subtext}>{sub}</span>}
    </Pressable>
  );
}

const selected = (isSelected: boolean) => (isSelected ? styles.selected : '');

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
      {/* Headlights, and the high beams beside them */}
      <div className={styles['controls-row']}>
        <div className={`${styles.segments} ${styles['headlight-segments']}`}>
          {HEADLIGHT_MODES.map(({ value, label }) => (
            <Pressable
              key={value}
              data-setting={value === 'off' ? 'headlights' : undefined}
              className={`${styles.segment} ${selected(settings.headlights === value)}`}
              pressed={settings.headlights === value}
              onPress={() => setSettings({ headlights: value })}
            >
              {value === 'off' && <SunIcon className={styles['segment-icon']} />}
              {label}
            </Pressable>
          ))}
        </div>
        <Pressable
          data-setting="high-beams"
          className={`${styles.tile} ${styles['side-tile']} ${active(settings.highBeams)}`}
          pressed={settings.highBeams}
          onPress={() => setSettings({ highBeams: !settings.highBeams })}
        >
          <span className={styles['tile-icon']}>
            <HighBeamIcon />
          </span>
          {/* The car shows only the lamp; the name is still there for anyone not looking. */}
          <span className={styles['visually-hidden']}>High Beams</span>
        </Pressable>
      </div>

      {/* Doors, windows and the glovebox */}
      <div className={`${styles['tile-group']} ${styles['tile-row']}`}>
        <Tile
          setting="fold-mirrors"
          icon={<FoldMirrorIcon />}
          label="Fold Mirrors"
          isOn={settings.foldMirrors}
          pressed={settings.foldMirrors}
          onPress={() => setSettings({ foldMirrors: !settings.foldMirrors })}
        />
        <Tile
          setting="child-lock"
          icon={<ChildLockIcon />}
          label="Child Lock"
          sub={settings.childLock !== 'off' ? childLockLabel?.label : undefined}
          isOn={settings.childLock !== 'off'}
          onPress={() => setOverlay(overlay === 'childLock' ? null : 'childLock')}
        />
        <Tile
          setting="window-lock"
          icon={<WindowLockIcon />}
          label="Window Lock"
          isOn={settings.windowLock}
          pressed={settings.windowLock}
          onPress={() => setSettings({ windowLock: !settings.windowLock })}
        />
        <Tile
          setting="vent-windows"
          icon={<VentWindowIcon />}
          label={settings.windowsVented ? 'Close Windows' : 'Vent Windows'}
          isOn={settings.windowsVented}
          pressed={settings.windowsVented}
          onPress={() => setSettings({ windowsVented: !settings.windowsVented })}
        />
      </div>

      {overlay === 'childLock' && (
        <div className={styles['child-lock-popup']} ref={childLockRef}>
          <div className={styles.segments}>
            {CHILD_LOCK_OPTIONS.map(({ value, label }) => (
              <Pressable
                key={value}
                className={`${styles.segment} ${selected(settings.childLock === value)}`}
                onPress={() => {
                  setSettings({ childLock: value });
                  closeOverlay();
                }}
              >
                {label}
              </Pressable>
            ))}
          </div>
        </div>
      )}

      {/* Wipers */}
      <div className={`${styles.segments} ${styles['wiper-segments']}`}>
        {WIPER_MODES.map(({ value, label }) => (
          <Pressable
            key={label}
            data-setting={label === 'Off' ? 'wipers' : undefined}
            className={`${styles.segment} ${selected(sameWipers(settings.wipers, value))}`}
            pressed={sameWipers(settings.wipers, value)}
            onPress={() => setSettings({ wipers: value })}
          >
            {label === 'Off' && <WiperIcon className={styles['segment-icon']} />}
            {label}
          </Pressable>
        ))}
      </div>

      {/* Adjustments, cameras and modes, two to a column */}
      <div className={styles['tile-columns']}>
        <div className={`${styles['tile-group']} ${styles['tile-column']}`}>
          <Tile
            setting="mirrors"
            icon={<MirrorAdjustIcon />}
            label="Mirrors"
            onPress={() => setOverlay('mirrors')}
          />
          <Tile
            setting="steering-wheel"
            icon={<SteeringAdjustIcon />}
            label="Steering"
            onPress={() => (steeringBlocked ? showNotice(steeringBlocked) : setOverlay('steering'))}
          />
        </div>
        <div className={`${styles['tile-group']} ${styles['tile-column']}`}>
          <Tile
            setting="dashcam"
            icon={<CameraIcon />}
            label="Dashcam"
            dot={dashcamOn}
            isOn={settings.dashcam}
            pressed={settings.dashcam}
            onPress={() => setSettings({ dashcam: !settings.dashcam })}
          />
          <Tile
            setting="sentry"
            icon={<SentryIcon />}
            label="Sentry"
            dot={settings.sentry}
            isOn={settings.sentry}
            pressed={settings.sentry}
            onPress={() => setSettings({ sentry: !settings.sentry })}
          />
        </div>
        <div className={`${styles['tile-group']} ${styles['tile-column']}`}>
          <Tile
            setting="car-wash"
            icon={<CarWashIcon />}
            label="Car Wash"
            onPress={() => enterMode('car-wash')}
          />
          <Tile
            setting="glovebox"
            icon={<GloveboxIcon />}
            label="Glovebox"
            sub={isGloveboxOpen ? 'Open' : undefined}
            isOn={isGloveboxOpen}
            pressed={isGloveboxOpen}
            onPress={toggleGlovebox}
          />
        </div>
      </div>

      {/* Brightness */}
      <div className={styles['controls-row']}>
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
          <SunIcon className={styles['brightness-icon']} />
        </div>
        <Pressable
          className={`${styles.tile} ${styles['side-tile']} ${styles['brightness-auto-btn']} ${active(autoBrightness)}`}
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
