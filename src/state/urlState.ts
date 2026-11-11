import { APPS } from '../apps/registry';
import { SETTINGS_PANELS, type CarState, type SettingsPanel, type Surface } from './carState';

export const CLOSED_HASH = '#/';
export const REAR_HASH = '#/rear';

// What Back has to undo, counted from the bare map. Each level is one history entry.
export type HistoryLayer = 0 | 1 | 2;

export const layerOf = (state: CarState): HistoryLayer => {
  if (state.activeModal) return 2;
  return state.surface.kind === 'closed' ? 0 : 1;
};

// Hashes rather than paths: a static host doesn't need to rewrite unknown paths back to the app.
export function surfaceToHash(surface: Surface): string {
  switch (surface.kind) {
    case 'closed':
      return CLOSED_HASH;
    case 'camera':
      return '#/camera';
    case 'settings':
      return `#/settings/${surface.panel.toLowerCase()}`;
    case 'app':
      return `#/${surface.app}`;
  }
}

const findPanel = (slug: string): SettingsPanel | undefined =>
  SETTINGS_PANELS.find((panel) => panel.toLowerCase() === slug.toLowerCase());

// Own keys only: a link is untrusted text, and `constructor` is `in` every object.
const isPanelApp = (id: string): id is Extract<Surface, { kind: 'app' }>['app'] =>
  Object.hasOwn(APPS, id) && id !== 'camera' && id !== 'car-settings';

// Null for anything that isn't a route, so a mistyped link can't open a blank panel.
export function hashToSurface(hash: string): Surface | null {
  const [first, second, ...rest] = hash.replace(/^#\/?/, '').split('/');
  if (rest.length > 0) return null;
  if (!first) return second ? null : { kind: 'closed' };

  if (first === 'settings' || first === 'car-settings') {
    const panel = second ? findPanel(second) : 'Controls';
    return panel ? { kind: 'settings', panel } : null;
  }
  if (second !== undefined) return null;
  if (first === 'camera') return { kind: 'camera' };
  return isPanelApp(first) ? { kind: 'app', app: first } : null;
}

export const isRearHash = (hash: string): boolean => hash === REAR_HASH;

export const sameSurface = (a: Surface, b: Surface): boolean =>
  surfaceToHash(a) === surfaceToHash(b);
