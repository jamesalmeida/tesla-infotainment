import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  autopilotTargetSpeed,
  MAX_FOLLOWING_DISTANCE,
  MAX_SPEED_OFFSET,
  MIN_FOLLOWING_DISTANCE,
  type Autopilot as AutopilotMode,
  type DrivingProfile,
} from '../../../../state/carState';
import { formatSpeed, speedUnit } from '../../../../utils/units';
import {
  ActionButton,
  ActionRow,
  Note,
  Panel,
  Section,
  Segmented,
  Slider,
  Stats,
  Toggle,
  type Choice,
} from './SettingsKit';

const PROFILES: Choice<DrivingProfile>[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'average', label: 'Average' },
  { value: 'assertive', label: 'Assertive' },
];

const AUTOPILOT_LABELS: Record<AutopilotMode, string> = {
  off: 'Not engaged',
  cruise: 'Cruise control engaged',
  autosteer: 'Autosteer engaged',
};

const signed = (value: string, isNegative: boolean) => `${isNegative ? '−' : '+'}${value}`;

function Engage() {
  const autopilot = useCar((state) => state.autopilot);
  const { engageAutopilot, disengageAutopilot } = useCarActions();

  return (
    <ActionRow
      setting="engage"
      label={AUTOPILOT_LABELS[autopilot]}
      description="Works in Drive. The brake, or leaving Drive, takes back control."
    >
      {autopilot === 'off' ? (
        <>
          <ActionButton onClick={() => engageAutopilot('cruise')}>Engage Cruise</ActionButton>
          <ActionButton primary onClick={() => engageAutopilot('autosteer')}>
            Engage Autosteer
          </ActionButton>
        </>
      ) : (
        <ActionButton onClick={disengageAutopilot}>Disengage</ActionButton>
      )}
    </ActionRow>
  );
}

function SelfDrivingDemo() {
  const autopilot = useCar((state) => state.autopilot);
  const targetSpeed = useCar(autopilotTargetSpeed);
  const settings = useCar((state) => state.settings);
  const { preferences } = settings;

  return (
    <div data-setting="self-driving-demo">
      <Stats
        items={[
          { label: 'Status', value: autopilot === 'off' ? 'Standing by' : 'Demo running' },
          {
            label: 'Set speed',
            value: `${formatSpeed(targetSpeed, preferences)} ${speedUnit(preferences)}`,
          },
          { label: 'Following distance', value: String(settings.followingDistance) },
          {
            label: 'Profile',
            value: PROFILES.find(({ value }) => value === settings.drivingProfile)?.label ?? '',
          },
        ]}
      />
    </div>
  );
}

export const Autopilot = () => {
  const settings = useCar((state) => state.settings);
  const { setSettings } = useCarActions();
  const { preferences, speedOffset } = settings;

  return (
    <Panel>
      <Note warning>
        This is a simulator. Nothing on this screen reflects what any real car can do, and it drives
        nothing but the numbers on your screen.
      </Note>

      <Section title="Driver assistance">
        <Toggle
          setting="cruise"
          label="Traffic-Aware Cruise Control"
          description="Lets the demo hold a set speed."
          checked={settings.trafficAwareCruise}
          onChange={(trafficAwareCruise) => setSettings({ trafficAwareCruise })}
        />
        <Toggle
          setting="autosteer"
          label="Autosteer"
          description="Adds steering to the demo, on top of cruise control."
          checked={settings.autosteer}
          onChange={(autosteer) => setSettings({ autosteer })}
        />
        <Engage />
      </Section>

      <Section title="Behaviour">
        <Slider
          setting="following-distance"
          label="Following Distance"
          info="Saved with your other settings. The simulator has no other traffic to follow."
          min={MIN_FOLLOWING_DISTANCE}
          max={MAX_FOLLOWING_DISTANCE}
          value={settings.followingDistance}
          valueLabel={String(settings.followingDistance)}
          onChange={(followingDistance) => setSettings({ followingDistance })}
        />
        <Slider
          setting="speed-offset"
          label="Speed Offset"
          description="How far above or below the speed limit the demo drives."
          min={-MAX_SPEED_OFFSET}
          max={MAX_SPEED_OFFSET}
          value={speedOffset}
          valueLabel={`${signed(formatSpeed(Math.abs(speedOffset), preferences), speedOffset < 0)} ${speedUnit(preferences)}`}
          onChange={(value) => setSettings({ speedOffset: value })}
        />
        <Segmented
          setting="driving-profile"
          label="Driving Profile"
          description="How quickly the demo gets up to its set speed."
          value={settings.drivingProfile}
          options={PROFILES}
          onChange={(drivingProfile) => setSettings({ drivingProfile })}
        />
      </Section>

      <Section title="Self-driving demo (read-only)">
        <SelfDrivingDemo />
      </Section>
    </Panel>
  );
};
