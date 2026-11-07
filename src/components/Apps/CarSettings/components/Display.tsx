import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { Appearance, PetMode, Preferences } from '../../../../state/carState';
import {
  ActionButton,
  ActionRow,
  Panel,
  Section,
  Segmented,
  Slider,
  Toggle,
  type Choice,
} from './SettingsKit';

const APPEARANCE: Choice<Appearance>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

const DISTANCE: Choice<Preferences['distance']>[] = [
  { value: 'mi', label: 'Miles' },
  { value: 'km', label: 'Kilometers' },
];

const TEMPERATURE: Choice<Preferences['temperature']>[] = [
  { value: 'F', label: '°F' },
  { value: 'C', label: '°C' },
];

const TIRE_PRESSURE: Choice<Preferences['tirePressure']>[] = [
  { value: 'psi', label: 'PSI' },
  { value: 'bar', label: 'Bar' },
  { value: 'kpa', label: 'kPa' },
];

const TIME_FORMAT: Choice<Preferences['timeFormat']>[] = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];

const ENERGY_DISPLAY: Choice<Preferences['energyDisplay']>[] = [
  { value: 'percent', label: 'Percent' },
  { value: 'distance', label: 'Distance' },
];

const PET_MODE: Choice<PetMode>[] = [
  { value: 'off', label: 'Off' },
  { value: 'dog', label: 'Dog' },
  { value: 'camp', label: 'Camp' },
];

export const Display = () => {
  const display = useCar((state) => state.display);
  const preferences = useCar((state) => state.settings.preferences);
  const petMode = useCar((state) => state.settings.petMode);
  const { enterMode, setDisplay, setSettings } = useCarActions();

  const setPreference = (patch: Partial<Preferences>) =>
    setSettings({ preferences: { ...preferences, ...patch } });

  return (
    <Panel>
      <Section title="Screen">
        <Segmented
          setting="appearance"
          label="Appearance"
          description={display.appearance === 'auto' ? 'Follows your device.' : undefined}
          value={display.appearance}
          options={APPEARANCE}
          onChange={(appearance) => setDisplay({ appearance })}
        />
        <Slider
          setting="brightness"
          label="Brightness"
          min={0}
          max={100}
          value={display.autoBrightness ? 100 : display.brightness}
          valueLabel={display.autoBrightness ? 'Auto' : `${display.brightness}%`}
          disabled={display.autoBrightness}
          onChange={(brightness) => setDisplay({ brightness })}
        />
        <Toggle
          setting="auto-brightness"
          label="Auto Brightness"
          checked={display.autoBrightness}
          onChange={(autoBrightness) => setDisplay({ autoBrightness })}
        />
        <Slider
          setting="blue-light"
          label="Blue Light Reduction"
          description="Warms the screen, which is easier on the eyes at night."
          min={0}
          max={100}
          value={display.blueLightReduction}
          valueLabel={`${display.blueLightReduction}%`}
          onChange={(blueLightReduction) => setDisplay({ blueLightReduction })}
        />
        <ActionRow
          setting="screen-clean"
          label="Screen Clean Mode"
          description="Darkens the screen and ignores touches so you can wipe it. Park only."
        >
          <ActionButton onClick={() => enterMode('screen-clean')}>Clean Screen</ActionButton>
        </ActionRow>
      </Section>

      <Section title="Units and format">
        <Segmented
          setting="distance-units"
          label="Distance"
          value={preferences.distance}
          options={DISTANCE}
          onChange={(distance) => setPreference({ distance })}
        />
        <Segmented
          setting="temperature-units"
          label="Temperature"
          value={preferences.temperature}
          options={TEMPERATURE}
          onChange={(temperature) => setPreference({ temperature })}
        />
        <Segmented
          setting="tire-pressure-units"
          label="Tire Pressure"
          value={preferences.tirePressure}
          options={TIRE_PRESSURE}
          onChange={(tirePressure) => setPreference({ tirePressure })}
        />
        <Segmented
          setting="time-format"
          label="Time Format"
          value={preferences.timeFormat}
          options={TIME_FORMAT}
          onChange={(timeFormat) => setPreference({ timeFormat })}
        />
        <Segmented
          setting="energy-display"
          label="Energy Display"
          value={preferences.energyDisplay}
          options={ENERGY_DISPLAY}
          onChange={(energyDisplay) => setPreference({ energyDisplay })}
        />
        <ActionRow setting="language" label="Language" description="English is the only option." />
      </Section>

      <Section title="Pets">
        <Segmented
          setting="pet-mode"
          label="Pet Mode"
          info="Saved with your other settings. Climate isn't simulated yet, so this choice doesn't do anything else."
          value={petMode}
          options={PET_MODE}
          onChange={(value) => setSettings({ petMode: value })}
        />
      </Section>
    </Panel>
  );
};
