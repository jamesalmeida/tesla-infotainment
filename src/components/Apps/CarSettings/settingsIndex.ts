import type { SettingsPanel } from '../../../state/carState';

export interface SettingEntry {
  // Matches the data-setting attribute on the control, which is how a jump finds it.
  id: string;
  label: string;
  panel: SettingsPanel;
  // Other words someone might type for this.
  keywords?: string[];
}

const panelEntry = (panel: SettingsPanel, keywords?: string[]): SettingEntry => ({
  id: `panel-${panel.toLowerCase()}`,
  label: panel,
  panel,
  keywords,
});

// Every setting search can reach. Adding a control means adding its line here.
export const SETTINGS_INDEX: SettingEntry[] = [
  { id: 'headlights', label: 'Headlights', panel: 'Controls', keywords: ['lights', 'parking'] },
  { id: 'high-beams', label: 'High Beams', panel: 'Controls', keywords: ['lights'] },
  { id: 'fold-mirrors', label: 'Fold Mirrors', panel: 'Controls' },
  { id: 'child-lock', label: 'Child Lock', panel: 'Controls', keywords: ['doors', 'kids'] },
  { id: 'window-lock', label: 'Window Lock', panel: 'Controls' },
  { id: 'vent-windows', label: 'Vent Windows', panel: 'Controls' },
  { id: 'wipers', label: 'Wipers', panel: 'Controls', keywords: ['rain'] },
  { id: 'mirrors', label: 'Mirrors', panel: 'Controls', keywords: ['adjust'] },
  { id: 'steering-wheel', label: 'Steering Wheel', panel: 'Controls', keywords: ['adjust'] },
  { id: 'dashcam', label: 'Dashcam', panel: 'Controls', keywords: ['camera', 'record', 'honk'] },
  { id: 'sentry', label: 'Sentry Mode', panel: 'Controls', keywords: ['alarm', 'security'] },
  { id: 'car-wash', label: 'Car Wash Mode', panel: 'Controls', keywords: ['free roll'] },
  { id: 'glovebox', label: 'Glovebox', panel: 'Controls' },

  { id: 'acceleration', label: 'Acceleration', panel: 'Dynamics', keywords: ['chill', 'sport'] },
  { id: 'steering-mode', label: 'Steering Mode', panel: 'Dynamics', keywords: ['comfort'] },
  { id: 'stopping-mode', label: 'Stopping Mode', panel: 'Dynamics', keywords: ['creep', 'hold'] },
  { id: 'regen', label: 'Regenerative Braking', panel: 'Dynamics', keywords: ['regen'] },
  { id: 'regen-limited', label: 'Brake When Regen Is Limited', panel: 'Dynamics' },
  { id: 'track-mode', label: 'Track Mode', panel: 'Dynamics' },
  { id: 'slip-start', label: 'Slip Start', panel: 'Dynamics', keywords: ['snow', 'mud', 'sand'] },
  { id: 'off-road-assist', label: 'Off-Road Assist', panel: 'Dynamics' },

  { id: 'charge-limit', label: 'Charge Limit', panel: 'Charging', keywords: ['battery'] },
  { id: 'charge-current', label: 'Charge Current', panel: 'Charging', keywords: ['amps'] },
  { id: 'charge-schedule', label: 'Scheduled Charging', panel: 'Charging', keywords: ['time'] },
  { id: 'charge-port', label: 'Charge Port', panel: 'Charging', keywords: ['cable', 'plug'] },
  { id: 'charge-session', label: 'Charging Session', panel: 'Charging', keywords: ['stats'] },

  {
    id: 'cruise',
    label: 'Traffic-Aware Cruise Control',
    panel: 'Autopilot',
    keywords: ['tacc', 'speed'],
  },
  { id: 'autosteer', label: 'Autosteer', panel: 'Autopilot', keywords: ['lane'] },
  { id: 'following-distance', label: 'Following Distance', panel: 'Autopilot' },
  { id: 'speed-offset', label: 'Speed Offset', panel: 'Autopilot', keywords: ['limit'] },
  { id: 'driving-profile', label: 'Driving Profile', panel: 'Autopilot', keywords: ['assertive'] },
  { id: 'self-driving-demo', label: 'Self-Driving Demo', panel: 'Autopilot' },

  { id: 'keys', label: 'Keys', panel: 'Locks', keywords: ['phone', 'card', 'fob'] },
  { id: 'walk-away-lock', label: 'Walk-Away Door Lock', panel: 'Locks' },
  { id: 'unlock-on-park', label: 'Unlock on Park', panel: 'Locks' },
  { id: 'drive-away-lock', label: 'Drive-Away Lock', panel: 'Locks' },
  { id: 'lock-sound', label: 'Lock Confirmation Sound', panel: 'Locks', keywords: ['chirp'] },
  { id: 'locks-child-lock', label: 'Child Lock', panel: 'Locks', keywords: ['doors', 'kids'] },

  { id: 'lights-headlights', label: 'Headlights', panel: 'Lights' },
  { id: 'auto-high-beam', label: 'Auto High Beam', panel: 'Lights' },
  { id: 'fog-lights', label: 'Fog Lights', panel: 'Lights' },
  { id: 'adaptive-headlights', label: 'Adaptive Headlights', panel: 'Lights' },
  { id: 'headlights-after-exit', label: 'Headlights After Exit', panel: 'Lights' },
  { id: 'dome-lights', label: 'Dome Lights', panel: 'Lights', keywords: ['interior'] },
  { id: 'ambient-lights', label: 'Ambient Lights', panel: 'Lights', keywords: ['interior'] },

  {
    id: 'appearance',
    label: 'Appearance',
    panel: 'Display',
    keywords: ['dark mode', 'light mode', 'theme'],
  },
  { id: 'brightness', label: 'Brightness', panel: 'Display' },
  { id: 'blue-light', label: 'Blue Light Reduction', panel: 'Display', keywords: ['night'] },
  { id: 'screen-clean', label: 'Screen Clean Mode', panel: 'Display' },
  { id: 'language', label: 'Language', panel: 'Display' },
  { id: 'distance-units', label: 'Distance Units', panel: 'Display', keywords: ['miles', 'km'] },
  {
    id: 'temperature-units',
    label: 'Temperature Units',
    panel: 'Display',
    keywords: ['celsius', 'fahrenheit'],
  },
  { id: 'tire-pressure-units', label: 'Tire Pressure Units', panel: 'Display', keywords: ['psi'] },
  { id: 'time-format', label: 'Time Format', panel: 'Display', keywords: ['24 hour', 'clock'] },
  { id: 'energy-display', label: 'Energy Display', panel: 'Display', keywords: ['range'] },
  { id: 'pet-mode', label: 'Pet Mode', panel: 'Display', keywords: ['dog', 'camp'] },

  panelEntry('Trips', ['odometer', 'distance']),
  panelEntry('Navigation', ['map', 'route']),
  panelEntry('Safety'),
  panelEntry('Service', ['tires']),
  panelEntry('Software', ['update', 'version']),
  panelEntry('Wifi', ['network', 'internet']),
];

const MAX_RESULTS = 8;

const matches = (entry: SettingEntry, query: string) =>
  [entry.label, ...(entry.keywords ?? [])].some((text) => text.toLowerCase().includes(query));

// Labels that start with the query come before ones that only contain it.
export function searchSettings(rawQuery: string): SettingEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const startsWithQuery = (entry: SettingEntry) => entry.label.toLowerCase().startsWith(query);
  const found = SETTINGS_INDEX.filter((entry) => matches(entry, query));

  return [
    ...found.filter(startsWithQuery),
    ...found.filter((entry) => !startsWithQuery(entry)),
  ].slice(0, MAX_RESULTS);
}
