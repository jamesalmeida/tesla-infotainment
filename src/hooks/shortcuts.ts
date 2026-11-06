import type { CarActions } from '../state/CarStateContext';
import type { Gear, Pedal } from '../state/carState';
import { getMediaTransport } from '../state/mediaTransport';
import { isKeyboardClaimed } from './keyboardClaim';

export type KeyboardMode = 'normal' | 'text' | 'game';

export type ShortcutGroup = 'Gears' | 'Driving' | 'Media' | 'Display';

export interface Shortcut {
  // Compared against event.key, with letters uppercased.
  keys: string[];
  shift?: boolean;
  // How the shortcut reads in the help overlay.
  label: string;
  description: string;
  group: ShortcutGroup;
  run: (actions: CarActions) => void;
}

const gear = (name: string, value: Gear, digit: string): Shortcut => ({
  keys: [value, digit],
  label: `${value} or ${digit}`,
  description: name,
  group: 'Gears',
  run: (actions) => actions.selectGear(value),
});

// The single list of shortcuts: the handler and the help overlay both read it.
export const SHORTCUTS: Shortcut[] = [
  gear('Park', 'P', '1'),
  gear('Reverse', 'R', '2'),
  gear('Neutral', 'N', '3'),
  gear('Drive', 'D', '4'),
  {
    keys: ['ArrowLeft'],
    shift: true,
    label: 'Shift + ←',
    description: 'Left turn signal',
    group: 'Driving',
    run: (actions) => actions.toggleLeftSignal(),
  },
  {
    keys: ['ArrowRight'],
    shift: true,
    label: 'Shift + →',
    description: 'Right turn signal',
    group: 'Driving',
    run: (actions) => actions.toggleRightSignal(),
  },
  {
    keys: ['H'],
    shift: true,
    label: 'Shift + H',
    description: 'Hazard lights',
    group: 'Driving',
    run: (actions) => actions.toggleHazards(),
  },
  {
    keys: ['F'],
    shift: true,
    label: 'Shift + F',
    description: 'Frunk',
    group: 'Driving',
    run: (actions) => actions.toggleCompartment('frunk'),
  },
  {
    keys: ['T'],
    shift: true,
    label: 'Shift + T',
    description: 'Trunk',
    group: 'Driving',
    run: (actions) => actions.toggleCompartment('trunk'),
  },
  {
    keys: [' '],
    shift: true,
    label: 'Shift + Space',
    description: 'Play or pause',
    group: 'Media',
    run: () => getMediaTransport()?.togglePlayPause(),
  },
  {
    keys: ['>'],
    shift: true,
    label: 'Shift + >',
    description: 'Next track',
    group: 'Media',
    run: () => getMediaTransport()?.next(),
  },
  {
    keys: ['<'],
    shift: true,
    label: 'Shift + <',
    description: 'Previous track',
    group: 'Media',
    run: () => getMediaTransport()?.previous(),
  },
  {
    keys: ['C'],
    shift: true,
    label: 'Shift + C',
    description: 'Backup camera',
    group: 'Display',
    run: (actions) => actions.toggleCamera(),
  },
  {
    keys: ['M'],
    shift: true,
    label: 'Shift + M',
    description: 'Search the map',
    group: 'Display',
    run: () => document.getElementById('navigateTo')?.focus(),
  },
  {
    keys: ['?'],
    shift: true,
    label: '?',
    description: 'Show this list',
    group: 'Display',
    run: (actions) => actions.toggleModal('shortcuts'),
  },
];

// Held rather than pressed, so they're handled by useSimulation instead of the table above.
export const PEDAL_KEYS: Record<string, Pedal> = {
  ArrowUp: 'accelerate',
  ArrowDown: 'brake',
};

const NON_TEXT_INPUTS = ['range', 'checkbox', 'radio', 'button', 'color', 'file', 'submit'];

export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.includes(target.type);
  return target instanceof HTMLTextAreaElement || target.isContentEditable === true;
}

export function keyboardMode(target: EventTarget | null): KeyboardMode {
  if (isTextEntry(target)) return 'text';
  return isKeyboardClaimed() ? 'game' : 'normal';
}

const normalizeKey = (key: string) => (key.length === 1 ? key.toUpperCase() : key);

export function findShortcut(event: KeyboardEvent): Shortcut | undefined {
  // Browser shortcuts such as Cmd+R belong to the browser, and a held key isn't a new press.
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return undefined;
  if (keyboardMode(event.target) !== 'normal') return undefined;
  const key = normalizeKey(event.key);
  return SHORTCUTS.find(
    (shortcut) => Boolean(shortcut.shift) === event.shiftKey && shortcut.keys.includes(key),
  );
}
