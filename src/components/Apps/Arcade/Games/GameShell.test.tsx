import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { isKeyboardClaimed } from '../../../../hooks/keyboardClaim';
import { GameShell } from './GameShell';
import { STEP_SECONDS, type GameDefinition, type GameInput } from './runtime';

interface TestState {
  over: boolean;
}

const stepSpy = vi.fn<(input: GameInput) => void>();
const drawSpy = vi.fn();

const game: GameDefinition<TestState> = {
  title: 'Test Game',
  howToPlay: 'Press things.',
  leftControls: [{ button: 'left', label: 'L', name: 'Go left' }],
  rightControls: [],
  create: () => ({ over: false }),
  step: (_state, input) => {
    stepSpy(input);
    return { over: input.held.has('down') };
  },
  isOver: (state) => state.over,
  result: () => ({ headline: 'Finished', detail: 'Well played.' }),
  draw: drawSpy,
};

let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
let now = 0;
let resize: ResizeObserverCallback | null = null;
let hidden = false;

// Runs one animation frame, `seconds` after the last.
const tick = (seconds = STEP_SECONDS) => {
  now += seconds * 1000;
  const pending = [...frames.values()];
  frames = new Map();
  act(() => pending.forEach((callback) => callback(now)));
};

const start = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  tick(); // The first frame only sets the clock.
};

const heldNow = () => stepSpy.mock.lastCall?.[0].held;
const renderGame = () => render(<GameShell game={game} onClose={() => {}} />);

beforeEach(() => {
  frames = new Map();
  hidden = false;
  stepSpy.mockClear();
  drawSpy.mockClear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame += 1;
    frames.set(nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: () => {},
  } as unknown as RenderingContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('claims the keyboard while mounted and releases it on unmount', () => {
  const { unmount } = renderGame();
  expect(isKeyboardClaimed()).toBe(true);
  unmount();
  expect(isKeyboardClaimed()).toBe(false);
});

test('unmounting cancels the animation frame', () => {
  const { unmount } = renderGame();
  expect(frames.size).toBe(1);
  unmount();
  expect(frames.size).toBe(0);
});

test('Close is on screen in every state', () => {
  const onClose = vi.fn();
  render(<GameShell game={game} onClose={onClose} />);
  screen.getByRole('button', { name: 'Close' });

  start();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.getByText('Paused')).toBeInTheDocument();
  screen.getByRole('button', { name: 'Close' });
});

test('nothing runs until the game is started', () => {
  renderGame();
  tick(0.05);
  expect(stepSpy).not.toHaveBeenCalled();

  start();
  tick(STEP_SECONDS * 3.5);
  expect(stepSpy).toHaveBeenCalledTimes(3);
});

test('hiding the tab pauses the game and it waits to be resumed', () => {
  renderGame();
  start();

  hidden = true;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(screen.getByText('Paused')).toBeInTheDocument();

  hidden = false;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  tick(0.05);
  expect(stepSpy).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  tick();
  tick(STEP_SECONDS * 1.5);
  expect(stepSpy).toHaveBeenCalled();
});

test('a long pause does not fast-forward the game', () => {
  renderGame();
  start();
  fireEvent.keyDown(window, { key: ' ' });
  tick(60);
  fireEvent.keyDown(window, { key: ' ' });
  tick(60); // Sets the clock again rather than counting the minute away.
  expect(stepSpy).not.toHaveBeenCalled();
});

test('arrow keys reach the game and are released on key up', () => {
  renderGame();
  start();

  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.has('left')).toBe(true);

  fireEvent.keyUp(window, { key: 'ArrowLeft' });
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.has('left')).toBe(false);
});

test('browser shortcuts and text fields are left alone', () => {
  render(
    <>
      <input aria-label="Search" />
      <GameShell game={game} onClose={() => {}} />
    </>,
  );
  start();

  fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
  fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'ArrowLeft' });
  fireEvent.keyDown(screen.getByLabelText('Search'), { key: ' ' });
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.size).toBe(0);
  expect(screen.queryByText('Paused')).not.toBeInTheDocument();
});

test('on-screen buttons hold a game button while pressed', () => {
  renderGame();
  start();
  const left = screen.getByRole('button', { name: 'Go left' });

  fireEvent.pointerDown(left, { pointerId: 1 });
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.has('left')).toBe(true);

  fireEvent.pointerUp(left, { pointerId: 1 });
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.has('left')).toBe(false);
});

test('a gamepad starts the game with A and drives it with the stick', () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { connected: true, axes: [0, 0], buttons };
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [null, pad],
  });
  renderGame();

  buttons[0].pressed = true;
  tick();
  expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();

  pad.axes = [-1, 0];
  tick();
  tick(STEP_SECONDS * 1.5);
  expect(heldNow()?.has('left')).toBe(true);

  Reflect.deleteProperty(navigator, 'getGamepads');
});

test('game over shows the result, and Play again starts a fresh game', () => {
  renderGame();
  start();

  fireEvent.keyDown(window, { key: 'ArrowDown' });
  tick(STEP_SECONDS * 1.5);
  expect(screen.getByText('Finished')).toBeInTheDocument();
  expect(screen.getByText('Well played.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
  tick();
  tick(STEP_SECONDS * 1.5);
  expect(screen.queryByText('Finished')).not.toBeInTheDocument();
});

test('leaving Park pauses the game, frees the keyboard and blocks resuming', () => {
  const { rerender } = renderGame();
  start();

  rerender(<GameShell game={game} onClose={() => {}} suspended />);
  expect(screen.getByText('Shift to Park to keep playing.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();
  expect(isKeyboardClaimed()).toBe(false);

  fireEvent.keyDown(window, { key: ' ' });
  expect(screen.getByText('Paused')).toBeInTheDocument();

  rerender(<GameShell game={game} onClose={() => {}} />);
  expect(isKeyboardClaimed()).toBe(true);
  expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
});

test('the canvas follows its container at the device pixel ratio', () => {
  vi.stubGlobal('devicePixelRatio', 2);
  renderGame();
  const canvas = screen.getByLabelText<HTMLCanvasElement>('Test Game');

  act(() => {
    resize?.(
      [{ contentRect: { width: 300, height: 150 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );
  });
  expect(canvas.width).toBe(600);
  expect(canvas.height).toBe(300);
  expect(drawSpy).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), {
    width: 300,
    height: 150,
  });
});

test('pressing inside the game does not start a drag on the sliding panel', () => {
  const onPanelPress = vi.fn();
  render(
    <div onMouseDown={onPanelPress} onTouchStart={onPanelPress}>
      <GameShell game={game} onClose={() => {}} />
    </div>,
  );
  const canvas = screen.getByLabelText('Test Game');
  fireEvent.mouseDown(canvas);
  fireEvent.touchStart(canvas);
  expect(onPanelPress).not.toHaveBeenCalled();
});
