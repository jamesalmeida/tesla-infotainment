import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { DomeLights, Headlights } from '../../../../state/carState';
import { Panel, Section, Segmented, Toggle, type Choice } from './SettingsKit';

const HEADLIGHTS: Choice<Headlights>[] = [
  { value: 'off', label: 'Off' },
  { value: 'parking', label: 'Parking' },
  { value: 'on', label: 'On' },
  { value: 'auto', label: 'Auto' },
];

const DOME: Choice<DomeLights>[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
  { value: 'auto', label: 'Auto' },
];

export const Lights = () => {
  const settings = useCar((state) => state.settings);
  const { setSettings } = useCarActions();

  return (
    <Panel>
      <Section title="Exterior">
        <Segmented
          setting="lights-headlights"
          label="Headlights"
          value={settings.headlights}
          options={HEADLIGHTS}
          onChange={(headlights) => setSettings({ headlights })}
        />
        <Toggle
          setting="lights-high-beams"
          label="High Beams"
          checked={settings.highBeams}
          onChange={(highBeams) => setSettings({ highBeams })}
        />
        <Toggle
          setting="auto-high-beam"
          label="Auto High Beam"
          description="Dips the high beams for traffic ahead."
          checked={settings.autoHighBeam}
          onChange={(autoHighBeam) => setSettings({ autoHighBeam })}
        />
        <Toggle
          setting="fog-lights"
          label="Fog Lights"
          checked={settings.fogLights}
          onChange={(fogLights) => setSettings({ fogLights })}
        />
        <Toggle
          setting="adaptive-headlights"
          label="Adaptive Headlights"
          description="Turns the beam into bends as you steer."
          checked={settings.adaptiveHeadlights}
          onChange={(adaptiveHeadlights) => setSettings({ adaptiveHeadlights })}
        />
        <Toggle
          setting="headlights-after-exit"
          label="Headlights After Exit"
          description="Keeps the lights on for a moment after you park at night."
          checked={settings.headlightsAfterExit}
          onChange={(headlightsAfterExit) => setSettings({ headlightsAfterExit })}
        />
      </Section>

      <Section title="Interior">
        <Segmented
          setting="dome-lights"
          label="Dome Lights"
          value={settings.domeLights}
          options={DOME}
          onChange={(domeLights) => setSettings({ domeLights })}
        />
        <Toggle
          setting="ambient-lights"
          label="Ambient Lights"
          checked={settings.ambientLights}
          onChange={(ambientLights) => setSettings({ ambientLights })}
        />
      </Section>
    </Panel>
  );
};
