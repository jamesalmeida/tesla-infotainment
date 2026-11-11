// What every Arcade game shares: the definition a game exports, its abstract input, and the
// pure helpers behind the loop in gameSession.ts.

export type GameButton = 'left' | 'right' | 'up' | 'down';

export interface GameInput {
  // Buttons down right now.
  held: ReadonlySet<GameButton>;
  // Buttons that went down since the previous step.
  pressed: ReadonlySet<GameButton>;
}

export type Random = () => number;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TouchControl {
  button: GameButton;
  label: string;
  name: string;
}

export interface GameResult {
  headline: string;
  detail: string;
}

export interface GameDefinition<S> {
  title: string;
  howToPlay: string;
  // On-screen buttons either side of the canvas, for touch and mouse.
  leftControls: TouchControl[];
  rightControls: TouchControl[];
  create: (random: Random) => S;
  step: (state: S, input: GameInput, seconds: number, random: Random) => S;
  // A touch or click on the canvas, for games that are played by tapping what is on screen.
  tap?: (state: S, point: Point, size: Size) => S;
  isOver: (state: S) => boolean;
  result: (state: S) => GameResult;
  draw: (ctx: CanvasRenderingContext2D, state: S, size: Size) => void;
}

export interface GameProps {
  onClose: () => void;
  // The car has left Park: the game pauses and cannot resume until it is back.
  suspended?: boolean;
}

// Rules always advance by this much, so a game plays the same at any frame rate.
export const STEP_SECONDS = 1 / 60;
// Longest stretch one frame may simulate, so a stall never turns into a burst of steps.
export const MAX_FRAME_SECONDS = 0.1;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// Moves `value` towards `target` by at most `delta`.
export const approach = (value: number, target: number, delta: number): number =>
  value < target ? Math.min(target, value + delta) : Math.max(target, value - delta);

// How many fixed steps a frame covers, and the time carried over to the next one.
export const consumeFrame = (
  carried: number,
  frameSeconds: number,
): { steps: number; carried: number } => {
  const available = carried + Math.min(frameSeconds, MAX_FRAME_SECONDS);
  const steps = Math.floor(available / STEP_SECONDS);
  return { steps, carried: available - steps * STEP_SECONDS };
};

// Small seedable generator, so tests can replay the same run.
export const createRandom = (seed: number): Random => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const KEY_BUTTONS: Record<string, GameButton | undefined> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export const keyToButton = (key: string): GameButton | undefined => KEY_BUTTONS[key];

export const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement || target.isContentEditable) return true;
  return target instanceof HTMLInputElement && target.type !== 'range';
};

const STICK_DEADZONE = 0.4;
// Standard gamepad mapping.
const PAD_CONFIRM = 0;
const PAD_START = 9;
const PAD_UP = 12;
const PAD_DOWN = 13;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;

export type PadState = Pick<Gamepad, 'axes' | 'buttons'>;

export const gamepadButtons = (pad: PadState): Set<GameButton> => {
  const isDown = (index: number) => Boolean(pad.buttons[index]?.pressed);
  const [stickX = 0, stickY = 0] = pad.axes;
  const buttons = new Set<GameButton>();
  if (isDown(PAD_LEFT) || stickX < -STICK_DEADZONE) buttons.add('left');
  if (isDown(PAD_RIGHT) || stickX > STICK_DEADZONE) buttons.add('right');
  if (isDown(PAD_UP) || stickY < -STICK_DEADZONE) buttons.add('up');
  if (isDown(PAD_DOWN) || stickY > STICK_DEADZONE) buttons.add('down');
  return buttons;
};

export const gamepadConfirm = (pad: PadState): boolean =>
  Boolean(pad.buttons[PAD_CONFIRM]?.pressed);

export const gamepadStart = (pad: PadState): boolean => Boolean(pad.buttons[PAD_START]?.pressed);

// Axis-aligned world sized for the rules, fitted into whatever the canvas happens to be.
export interface WorldView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const fitWorld = (size: Size, worldWidth: number, worldHeight: number): WorldView => {
  const scale = Math.min(size.width / worldWidth, size.height / worldHeight);
  return {
    scale,
    offsetX: (size.width - worldWidth * scale) / 2,
    offsetY: (size.height - worldHeight * scale) / 2,
  };
};

export const toWorld = (point: Point, view: WorldView): Point => ({
  x: (point.x - view.offsetX) / view.scale,
  y: (point.y - view.offsetY) / view.scale,
});
