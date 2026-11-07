import { GameShell } from '../GameShell';
import type { GameDefinition, GameProps } from '../runtime';
import { draw } from './draw';
import { createState, isOver, step, type KilowattState } from './rules';

const game: GameDefinition<KilowattState> = {
  title: 'Kilowatt Commute',
  howToPlay:
    'Up and down change lanes. Hold right to boost, hold left to regen brake and win back charge. Crashes cost charge, green pads add it. Keep going until the battery is flat.',
  leftControls: [
    { button: 'up', label: '▲', name: 'Lane up' },
    { button: 'down', label: '▼', name: 'Lane down' },
  ],
  rightControls: [
    { button: 'right', label: 'Boost', name: 'Boost' },
    { button: 'left', label: 'Regen', name: 'Regen brake' },
  ],
  create: createState,
  step,
  isOver,
  result: (state) => ({
    headline: 'Out of charge',
    detail: `You got ${state.distance.toFixed(1)} km down the road.`,
  }),
  draw,
};

export const KilowattCommute = (props: GameProps) => <GameShell game={game} {...props} />;
