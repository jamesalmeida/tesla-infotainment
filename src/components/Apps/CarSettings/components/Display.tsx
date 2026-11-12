import { useState } from 'react';
import { openRearWindow } from '../../../../apps/rearDisplay';
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
import {
  canRequestFullscreen,
  exitFullscreen,
  isStandalone,
  requestFullscreen,
  useIsFullscreen,
} from '../../../../utils/fullscreen';

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

const HOME_SCREEN_HINT =
  "This browser can't hide its bars for a web page. In Safari, tap Share, then Add to Home Screen, and open the app from there.";

// Always here, so full screen is one tap away on a touch screen after the first-visit hint
// is gone.
function FullScreenRow() {
  const fullscreen = useIsFullscreen();
  const [blocked, setBlocked] = useState(false);
  const standalone = isStandalone();

  let description = "Hides the browser's bars so the display fills the screen.";
  if (standalone) description = 'Already full screen: the app was opened from the Home Screen.';
  else if (blocked || !canRequestFullscreen()) description = HOME_SCREEN_HINT;

  const toggle = () => {
    if (fullscreen) {
      void exitFullscreen();
      return;
    }
    void requestFullscreen().then((entered) => setBlocked(!entered));
  };

  return (
    <ActionRow setting="full-screen" label="Full Screen" description={description}>
      <ActionButton onClick={toggle} disabled={standalone}>
        {fullscreen ? 'Exit Full Screen' : 'Full Screen'}
      </ActionButton>
    </ActionRow>
  );
}

export const Display = () => {
  const display = useCar((state) => state.display);
  const settings = useCar((state) => state.settings);
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
        <Toggle
          setting="on-screen-keyboard"
          label="On-Screen Keyboard"
          description="A themed keyboard for desktop kiosks. Phones and tablets use their own."
          checked={settings.onScreenKeyboard}
          onChange={(onScreenKeyboard) => setSettings({ onScreenKeyboard })}
        />
        <ActionRow
          setting="rear-display"
          label="Rear Display"
          description="Open a second window with rear climate and media controls."
        >
          <ActionButton onClick={openRearWindow}>Open</ActionButton>
        </ActionRow>
        <FullScreenRow />
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
