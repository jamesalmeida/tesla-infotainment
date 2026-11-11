import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { AssistantStyle, ImmersiveSound } from '../../../../state/carState';
import {
  Button,
  ButtonRow,
  Choice,
  DemoNote,
  Page,
  Section,
  Slider,
  Toggle,
  panelStyles,
} from './SystemPanel';

const IMMERSIVE_OPTIONS: { value: ImmersiveSound; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
];

const ASSISTANT_STYLES: { value: AssistantStyle; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'playful', label: 'Playful' },
];

const decibels = (value: number) => `${value > 0 ? '+' : ''}${value} dB`;

const leaning =
  (negative: string, positive: string) =>
  (value: number): string => {
    if (value === 0) return 'Centre';
    return `${value < 0 ? negative : positive} ${Math.abs(value)}`;
  };

const percent = (value: number) => (value === 0 ? 'Muted' : `${value}%`);

export const Audio = () => {
  const settings = useCar((state) => state.settings);
  const volume = useCar((state) => state.volume);
  const { setSettings, setVolume } = useCarActions();

  return (
    <Page title="Audio">
      <div className={panelStyles.twoColumns}>
        <Section title="Volume" hint="Directions have their own level, so music can stay quiet.">
          <Slider
            label="Media Volume"
            value={volume}
            min={0}
            max={100}
            format={percent}
            onChange={setVolume}
          />
          <Slider
            label="Navigation Volume"
            value={settings.navVolume}
            min={0}
            max={100}
            format={percent}
            onChange={(navVolume) => setSettings({ navVolume })}
          />
        </Section>
        <Section title="Car Sounds" hint="Short chimes for the car itself, separate from media.">
          <Toggle
            label="Car Sounds"
            hint="Indicator ticks, door sounds and the seat belt reminder."
            checked={settings.soundsEnabled}
            onChange={(soundsEnabled) => setSettings({ soundsEnabled })}
          />
          <Toggle
            label="Lock Sound"
            hint="A short chime when the car locks."
            checked={settings.lockSound}
            onChange={(lockSound) => setSettings({ lockSound })}
          />
        </Section>
        <Section title="Tone">
          <Slider
            label="Bass"
            value={settings.eqBass}
            min={-6}
            max={6}
            format={decibels}
            onChange={(eqBass) => setSettings({ eqBass })}
          />
          <Slider
            label="Mid"
            value={settings.eqMid}
            min={-6}
            max={6}
            format={decibels}
            onChange={(eqMid) => setSettings({ eqMid })}
          />
          <Slider
            label="Treble"
            value={settings.eqTreble}
            min={-6}
            max={6}
            format={decibels}
            onChange={(eqTreble) => setSettings({ eqTreble })}
          />
          <ButtonRow>
            <Button onPress={() => setSettings({ eqBass: 0, eqMid: 0, eqTreble: 0 })}>
              Reset Tone
            </Button>
          </ButtonRow>
        </Section>
      </div>
      <div className={panelStyles.twoColumns}>
        <Section title="Balance and Fade">
          <Slider
            label="Balance"
            value={settings.audioBalance}
            min={-10}
            max={10}
            format={leaning('Left', 'Right')}
            onChange={(audioBalance) => setSettings({ audioBalance })}
          />
          <Slider
            label="Fade"
            value={settings.audioFade}
            min={-10}
            max={10}
            format={leaning('Rear', 'Front')}
            onChange={(audioFade) => setSettings({ audioFade })}
          />
          <Choice
            label="Immersive Sound"
            hint="Spreads audio around the cabin."
            value={settings.immersiveSound}
            options={IMMERSIVE_OPTIONS}
            onChange={(immersiveSound) => setSettings({ immersiveSound })}
          />
        </Section>
        <Section title="Grok">
          <DemoNote>
            Demo only: no assistant is connected, so these are just saved choices.
          </DemoNote>
          <Toggle
            label="Voice Assistant"
            checked={settings.assistantEnabled}
            onChange={(assistantEnabled) => setSettings({ assistantEnabled })}
          />
          <Choice
            label="Style"
            value={settings.assistantStyle}
            options={ASSISTANT_STYLES}
            disabled={!settings.assistantEnabled}
            onChange={(assistantStyle) => setSettings({ assistantStyle })}
          />
        </Section>
      </div>
    </Page>
  );
};
