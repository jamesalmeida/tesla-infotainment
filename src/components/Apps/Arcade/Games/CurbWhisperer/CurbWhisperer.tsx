import { GameShell } from '../GameShell';
import type { GameDefinition, GameProps } from '../runtime';
import { draw } from './draw';
import { LEVELS } from './levels';
import { MAX_SCUFFS, createState, isOver, step, type CurbState } from './rules';

const game: GameDefinition<CurbState> = {
  title: 'Curb Whisperer',
  howToPlay: `Up drives, down reverses, left and right steer. Stop in the blue bay facing the way its arrow points so the charger reaches your port. ${MAX_SCUFFS} scuffs and your run is over.`,
  leftControls: [
    { button: 'left', label: '◀', name: 'Steer left' },
    { button: 'right', label: '▶', name: 'Steer right' },
  ],
  rightControls: [
    { button: 'up', label: '▲', name: 'Drive' },
    { button: 'down', label: '▼', name: 'Reverse' },
  ],
  create: createState,
  step,
  isOver,
  result: (state) =>
    state.won
      ? {
          headline: 'All parked',
          detail: `${state.score} points with ${state.scuffs} scuffs.`,
        }
      : {
          headline: 'Too many scuffs',
          detail: `You reached bay ${state.level + 1} of ${LEVELS.length} with ${state.score} points.`,
        },
  draw,
};

export const CurbWhisperer = (props: GameProps) => <GameShell game={game} {...props} />;
