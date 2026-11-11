import { APPS, type AppId } from './registry';
import { SETTINGS_PANELS, type Gear, type SettingsPanel } from '../state/carState';
import { MAX_TEMPERATURE, MIN_TEMPERATURE } from '../state/climate';

export type VoiceCommand =
  | { kind: 'navigate'; query: string }
  | { kind: 'temperature'; value: number }
  | { kind: 'compartment'; compartment: 'trunk' | 'frunk'; open: boolean }
  | { kind: 'app'; app: AppId }
  | { kind: 'settings'; panel: SettingsPanel }
  | { kind: 'gear'; gear: Gear }
  | { kind: 'media'; action: 'play' | 'pause' | 'next' | 'previous' }
  | { kind: 'lock'; locked: boolean }
  | { kind: 'headlights'; mode: 'on' | 'off' }
  | { kind: 'unknown'; text: string };

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const clampTemperature = (value: number): number =>
  Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.round(value)));

const findApp = (spoken: string): AppId | null => {
  const entries = Object.entries(APPS) as [AppId, { label: string }][];
  const match = entries.find(([, app]) => normalise(app.label) === spoken);
  return match?.[0] ?? null;
};

const findPanel = (spoken: string): SettingsPanel | null =>
  SETTINGS_PANELS.find((panel) => normalise(panel) === spoken) ?? null;

const GEAR_WORDS: Record<string, Gear> = {
  park: 'P',
  reverse: 'R',
  neutral: 'N',
  drive: 'D',
};

// Voice is a convenience, not the only way: anything it can't parse stays unknown and
// the screen says so rather than guessing.
export function parseVoiceCommand(input: string): VoiceCommand {
  const text = normalise(input);
  if (text === '') return { kind: 'unknown', text: input };

  // Gear words are checked first, so "go to park" is a shift and "go to Paris" is a route.
  const gear = text.match(/^(?:put it in |shift to |go to |go )?(park|reverse|neutral|drive)$/);
  if (gear) return { kind: 'gear', gear: GEAR_WORDS[gear[1]] };

  const navigate = text.match(/^(?:navigate|drive|go|take me) to (.+)$/);
  if (navigate) return { kind: 'navigate', query: navigate[1] };

  const temperature = text.match(
    /^(?:set|make|change) (?:the )?(?:driver )?temperature to (\d{1,3})(?: degrees)?$/,
  );
  if (temperature) return { kind: 'temperature', value: clampTemperature(Number(temperature[1])) };

  const compartment = text.match(/^(open|close) (?:the )?(trunk|frunk)$/);
  if (compartment) {
    return {
      kind: 'compartment',
      compartment: compartment[2] as 'trunk' | 'frunk',
      open: compartment[1] === 'open',
    };
  }

  const headlights = text.match(/^(?:turn )?(on|off) (?:the )?headlights$/);
  if (headlights) return { kind: 'headlights', mode: headlights[1] as 'on' | 'off' };

  const headlightSwitch = text.match(/^headlights (on|off)$/);
  if (headlightSwitch) return { kind: 'headlights', mode: headlightSwitch[1] as 'on' | 'off' };

  const lock = text.match(/^(lock|unlock)(?: the)?(?: car| doors)?$/);
  if (lock) return { kind: 'lock', locked: lock[1] === 'lock' };

  if (/^(play|resume)$/.test(text)) return { kind: 'media', action: 'play' };
  if (/^pause$/.test(text)) return { kind: 'media', action: 'pause' };
  if (/^(next|next track|skip)$/.test(text)) return { kind: 'media', action: 'next' };
  if (/^(previous|previous track|go back)$/.test(text)) {
    return { kind: 'media', action: 'previous' };
  }

  const open = text.match(/^(?:open|launch|show) (?:the )?(.+)$/);
  if (open) {
    const spoken = open[1];
    if (spoken === 'settings') return { kind: 'settings', panel: 'Controls' };
    const app = findApp(spoken);
    if (app) return { kind: 'app', app };
    const panel = findPanel(spoken);
    if (panel) return { kind: 'settings', panel };
  }

  return { kind: 'unknown', text: input };
}

export function describeVoiceCommand(command: VoiceCommand): string {
  switch (command.kind) {
    case 'navigate':
      return `Navigating to ${command.query}`;
    case 'temperature':
      return `Temperature set to ${command.value}`;
    case 'compartment':
      return `${command.compartment === 'trunk' ? 'Trunk' : 'Frunk'} ${command.open ? 'opening' : 'closing'}`;
    case 'app':
      return `Opening ${APPS[command.app].label}`;
    case 'settings':
      return `Opening ${command.panel} settings`;
    case 'gear':
      return `Shifting to ${command.gear}`;
    case 'media':
      return {
        play: 'Playing',
        pause: 'Paused',
        next: 'Next track',
        previous: 'Previous track',
      }[command.action];
    case 'lock':
      return command.locked ? 'Locking the car' : 'Unlocking the car';
    case 'headlights':
      return `Headlights ${command.mode}`;
    case 'unknown':
      return `I didn't catch that: “${command.text}”`;
  }
}
