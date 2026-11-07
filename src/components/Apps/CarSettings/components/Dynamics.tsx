import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type {
  Acceleration,
  RegenMode,
  SteeringMode,
  StoppingMode,
} from '../../../../state/carState';
import { Panel, Section, Segmented, Toggle, type Choice } from './SettingsKit';

const ACCELERATION: Choice<Acceleration>[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'standard', label: 'Standard' },
  { value: 'sport', label: 'Sport' },
];

const STEERING: Choice<SteeringMode>[] = [
  { value: 'comfort', label: 'Comfort' },
  { value: 'standard', label: 'Standard' },
  { value: 'sport', label: 'Sport' },
];

const STOPPING: Choice<StoppingMode>[] = [
  { value: 'creep', label: 'Creep' },
  { value: 'roll', label: 'Roll' },
  { value: 'hold', label: 'Hold' },
];

const STOPPING_DESCRIPTIONS: Record<StoppingMode, string> = {
  creep: 'The car edges forward at walking pace when you lift off the pedals.',
  roll: 'Regen fades out at low speed, so the car rolls gently to a stop.',
  hold: 'Regen brings the car to a stop and keeps it there, with no pedal down.',
};

const REGEN: Choice<RegenMode>[] = [
  { value: 'low', label: 'Low' },
  { value: 'standard', label: 'Standard' },
];

export const Dynamics = () => {
  const settings = useCar((state) => state.settings);
  const { setSettings } = useCarActions();

  return (
    <Panel>
      <Section title="Driving">
        <Segmented
          setting="acceleration"
          label="Acceleration"
          description={settings.trackMode ? 'Track Mode sets this while it is on.' : undefined}
          value={settings.acceleration}
          options={ACCELERATION}
          onChange={(acceleration) => setSettings({ acceleration })}
        />
        <Segmented
          setting="steering-mode"
          label="Steering Mode"
          info="Saved with your other settings. The simulator has no steering, so it doesn't change how the car drives here."
          value={settings.steeringMode}
          options={STEERING}
          onChange={(steeringMode) => setSettings({ steeringMode })}
        />
      </Section>

      <Section title="Slowing down">
        <Segmented
          setting="stopping-mode"
          label="Stopping Mode"
          description={STOPPING_DESCRIPTIONS[settings.stoppingMode]}
          value={settings.stoppingMode}
          options={STOPPING}
          onChange={(stoppingMode) => setSettings({ stoppingMode })}
        />
        <Segmented
          setting="regen"
          label="Regenerative Braking"
          description="How strongly the car slows, and how much energy it recovers, when you lift off."
          value={settings.regenBraking}
          options={REGEN}
          onChange={(regenBraking) => setSettings({ regenBraking })}
        />
        <Toggle
          setting="regen-limited"
          label="Brake When Regen Is Limited"
          description="A nearly full battery can't take regen. This uses the brakes to slow the same amount."
          checked={settings.brakeWhenRegenLimited}
          onChange={(brakeWhenRegenLimited) => setSettings({ brakeWhenRegenLimited })}
        />
      </Section>

      <Section title="Performance">
        <Toggle
          setting="track-mode"
          label="Track Mode"
          description="More power, stronger regen and a higher top speed, for more energy. Turns on in Park only, and turns Autopilot off."
          checked={settings.trackMode}
          onChange={(trackMode) => setSettings({ trackMode })}
        />
        <Toggle
          setting="slip-start"
          label="Slip Start"
          description="For a car stuck in snow, sand or mud."
          info="Saved with your other settings. The simulator has no surfaces, so it doesn't change how the car drives here."
          checked={settings.slipStart}
          onChange={(slipStart) => setSettings({ slipStart })}
        />
        <Toggle
          setting="off-road-assist"
          label="Off-Road Assist"
          description="For driving on loose ground."
          info="Saved with your other settings. The simulator has no surfaces, so it doesn't change how the car drives here."
          checked={settings.offRoadAssist}
          onChange={(offRoadAssist) => setSettings({ offRoadAssist })}
        />
      </Section>
    </Panel>
  );
};
