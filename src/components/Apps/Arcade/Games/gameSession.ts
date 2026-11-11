import {
  STEP_SECONDS,
  consumeFrame,
  gamepadButtons,
  gamepadConfirm,
  gamepadStart,
  isTextEntry,
  keyToButton,
  type GameButton,
  type GameDefinition,
  type GameInput,
  type GameResult,
  type Point,
  type Random,
  type Size,
} from './runtime';

export type GameStatus = 'ready' | 'playing' | 'paused' | 'over';

export interface SessionView {
  status: GameStatus;
  result: GameResult | null;
}

export interface GameSession {
  // The one main action: start, pause, resume or play again, depending on the status.
  primary: () => void;
  setSuspended: (suspended: boolean) => void;
  touch: (button: GameButton, isDown: boolean) => void;
  tap: (point: Point) => void;
  stop: () => void;
}

interface SessionOptions<S> {
  game: GameDefinition<S>;
  canvas: HTMLCanvasElement;
  onChange: (view: SessionView) => void;
  random?: Random;
}

// Runs one game on one canvas: the animation loop, input, resizing and pausing. The rules stay
// in the game's pure functions and React only renders the controls around the canvas.
export function startGameSession<S>({
  game,
  canvas,
  onChange,
  random = Math.random,
}: SessionOptions<S>): GameSession {
  const ctx = canvas.getContext('2d');
  let state = game.create(random);
  let status: GameStatus = 'ready';
  let suspended = false;
  let size: Size = { width: 0, height: 0 };
  let needsDraw = true;

  let frame = 0;
  let lastFrameTime: number | null = null;
  let carried = 0;

  const keyboardHeld = new Set<GameButton>();
  const touchHeld = new Set<GameButton>();
  let padHeld = new Set<GameButton>();
  let padConfirmDown = false;
  let padStartDown = false;
  const pressed = new Set<GameButton>();

  const releaseButtons = () => {
    keyboardHeld.clear();
    touchHeld.clear();
    pressed.clear();
  };

  const setStatus = (next: GameStatus) => {
    if (next === status) return;
    status = next;
    releaseButtons();
    lastFrameTime = null;
    carried = 0;
    needsDraw = true;
    onChange({ status, result: status === 'over' ? game.result(state) : null });
  };

  const pause = () => {
    if (status === 'playing') setStatus('paused');
  };

  const primary = () => {
    if (status === 'playing') {
      pause();
    } else if (!suspended) {
      if (status === 'over') state = game.create(random);
      setStatus('playing');
    }
  };

  const press = (held: Set<GameButton>, button: GameButton) => {
    if (status !== 'playing') return;
    if (!held.has(button)) pressed.add(button);
    held.add(button);
  };

  const draw = () => {
    needsDraw = false;
    if (!ctx || size.width === 0 || size.height === 0) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    game.draw(ctx, state, size);
  };

  const pollGamepad = () => {
    const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected);
    if (!pad) {
      padHeld = new Set();
      return;
    }

    const confirmDown = gamepadConfirm(pad);
    const startDown = gamepadStart(pad);
    const confirmPressed = confirmDown && !padConfirmDown && status !== 'playing';
    if (confirmPressed || (startDown && !padStartDown)) primary();
    padConfirmDown = confirmDown;
    padStartDown = startDown;

    const buttons = status === 'playing' ? gamepadButtons(pad) : new Set<GameButton>();
    for (const button of buttons) {
      if (!padHeld.has(button)) pressed.add(button);
    }
    padHeld = buttons;
  };

  const currentInput = (): GameInput => ({
    held: new Set([...keyboardHeld, ...touchHeld, ...padHeld]),
    pressed,
  });

  const advance = (now: number) => {
    const frameSeconds = lastFrameTime === null ? 0 : (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const consumed = consumeFrame(carried, frameSeconds);
    carried = consumed.carried;

    for (let step = 0; step < consumed.steps; step += 1) {
      state = game.step(state, currentInput(), STEP_SECONDS, random);
      pressed.clear();
      needsDraw = true;
      if (game.isOver(state)) {
        setStatus('over');
        return;
      }
    }
  };

  const onFrame = (now: number) => {
    frame = requestAnimationFrame(onFrame);
    pollGamepad();
    if (status === 'playing') advance(now);
    if (needsDraw) draw();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isTextEntry(event.target)) return;

    const button = keyToButton(event.key);
    if (button) {
      event.preventDefault();
      press(keyboardHeld, button);
    } else if (event.key === 'Escape') {
      if (status === 'playing' || status === 'paused') primary();
    } else if (event.key === ' ' || event.key === 'Enter') {
      // A focused button activates itself, so Space on Close must not also restart the game.
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (!event.repeat) primary();
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const button = keyToButton(event.key);
    if (button) keyboardHeld.delete(button);
  };

  const onVisibilityChange = () => {
    if (document.hidden) pause();
  };

  const resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const ratio = window.devicePixelRatio || 1;
    size = { width, height };
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    draw();
  });

  resizeObserver.observe(canvas.parentElement ?? canvas);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseButtons);
  document.addEventListener('visibilitychange', onVisibilityChange);
  frame = requestAnimationFrame(onFrame);

  return {
    primary,
    setSuspended: (next) => {
      suspended = next;
      if (suspended) pause();
    },
    touch: (button, isDown) => {
      if (isDown) press(touchHeld, button);
      else touchHeld.delete(button);
    },
    tap: (point) => {
      if (status !== 'playing' || !game.tap) return;
      state = game.tap(state, point, size);
      needsDraw = true;
    },
    stop: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseButtons);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
