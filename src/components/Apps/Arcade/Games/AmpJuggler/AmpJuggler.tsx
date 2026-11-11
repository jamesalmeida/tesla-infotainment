import { GameShell } from '../GameShell';
import { fitWorld, toWorld, type GameDefinition, type GameProps } from '../runtime';
import { draw } from './draw';
import {
  MAX_STRIKES,
  SITE_CAPACITY,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createState,
  isOver,
  step,
  tapWorld,
  type AmpState,
} from './rules';

const game: GameDefinition<AmpState> = {
  title: 'Amp Juggler',
  howToPlay: `Share the site's power between four stalls. Tap the top of a stall for more power and the bottom for less, or use the arrow keys. Going over ${SITE_CAPACITY} heats the breaker. ${MAX_STRIKES} drivers leaving unhappy ends your shift.`,
  leftControls: [],
  rightControls: [],
  create: createState,
  step,
  tap: (state, point, size) =>
    tapWorld(state, toWorld(point, fitWorld(size, WORLD_WIDTH, WORLD_HEIGHT))),
  isOver,
  result: (state) => ({
    headline: 'Shift over',
    detail: `${state.served} ${state.served === 1 ? 'car' : 'cars'} charged, ${state.score} points.`,
  }),
  draw,
};

export const AmpJuggler = (props: GameProps) => <GameShell game={game} {...props} />;
