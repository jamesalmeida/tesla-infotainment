import { lazy, type ComponentType } from 'react';
import type { GameId } from './arcadeView';
import type { GameProps } from './Games/runtime';

export interface ArcadeGame {
  id: GameId;
  name: string;
  description: string;
  // Without a component the game shows as "Coming soon".
  component?: ComponentType<GameProps>;
}

// Each game is its own chunk, downloaded the first time it is played.
const KilowattCommute = lazy(() =>
  import('./Games/KilowattCommute/KilowattCommute').then((module) => ({
    default: module.KilowattCommute,
  })),
);
const AmpJuggler = lazy(() =>
  import('./Games/AmpJuggler/AmpJuggler').then((module) => ({ default: module.AmpJuggler })),
);
const CurbWhisperer = lazy(() =>
  import('./Games/CurbWhisperer/CurbWhisperer').then((module) => ({
    default: module.CurbWhisperer,
  })),
);

export const games: ArcadeGame[] = [
  {
    id: 'kilowatt-commute',
    name: 'Kilowatt Commute',
    description:
      'Dodge the morning traffic and stretch every last electron. Crashes cost charge, regen wins it back.',
    component: KilowattCommute,
  },
  {
    id: 'amp-juggler',
    name: 'Amp Juggler',
    description:
      'Four stalls, not enough power. Keep the drivers happy without tripping the breaker.',
    component: AmpJuggler,
  },
  {
    id: 'curb-whisperer',
    name: 'Curb Whisperer',
    description: 'Five tight bays, one clean paint job. Park facing the charger to move on.',
    component: CurbWhisperer,
  },
];
