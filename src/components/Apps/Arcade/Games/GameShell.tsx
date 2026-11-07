import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from 'react';
import { claimKeyboard, releaseKeyboard } from '../keyboardClaim';
import { startGameSession, type GameSession, type SessionView } from './gameSession';
import type { GameDefinition, GameProps, TouchControl } from './runtime';
import styles from './GameShell.module.css';

interface GameShellProps<S> extends GameProps {
  game: GameDefinition<S>;
}

// The panel slides closed when dragged, which must not happen while steering a game.
const keepFromPanel = (event: SyntheticEvent) => event.stopPropagation();

interface TouchPadProps {
  className: string;
  controls: TouchControl[];
  onTouch: (control: TouchControl, isDown: boolean) => void;
}

const TouchPad = ({ className, controls, onTouch }: TouchPadProps) => (
  <div className={`${styles.touchPad} ${className}`}>
    {controls.map((control) => (
      <button
        key={control.button}
        type="button"
        tabIndex={-1}
        aria-label={control.name}
        className={styles.touchButton}
        // Focus stays off these so Space keeps meaning pause.
        onMouseDown={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          onTouch(control, true);
        }}
        onPointerUp={() => onTouch(control, false)}
        onPointerCancel={() => onTouch(control, false)}
        onLostPointerCapture={() => onTouch(control, false)}
      >
        {control.label}
      </button>
    ))}
  </div>
);

export function GameShell<S>({ game, onClose, suspended = false }: GameShellProps<S>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const [view, setView] = useState<SessionView>({ status: 'ready', result: null });

  useEffect(() => {
    if (!canvasRef.current) return;
    const session = startGameSession({ game, canvas: canvasRef.current, onChange: setView });
    sessionRef.current = session;
    return () => {
      session.stop();
      sessionRef.current = null;
    };
  }, [game]);

  useEffect(() => {
    sessionRef.current?.setSuspended(suspended);
    // A suspended game isn't running, so the keys that shift back to Park have to work.
    if (suspended) return;
    claimKeyboard();
    return releaseKeyboard;
  }, [suspended]);

  const handleTouch = (control: TouchControl, isDown: boolean) =>
    sessionRef.current?.touch(control.button, isDown);

  const handleCanvasPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    sessionRef.current?.tap({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  const { status, result } = view;
  const primary = () => sessionRef.current?.primary();

  return (
    <div className={styles.shell} onMouseDown={keepFromPanel} onTouchStart={keepFromPanel}>
      <div className={styles.topBar}>
        <div className={styles.title}>{game.title}</div>
        {status === 'playing' && (
          <button type="button" className={styles.barButton} onClick={primary}>
            Pause
          </button>
        )}
        <button type="button" className={styles.barButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.stage}>
        <TouchPad className={styles.leftPad} controls={game.leftControls} onTouch={handleTouch} />
        <div className={styles.screen}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-label={game.title}
            onPointerDown={handleCanvasPointer}
          />
          {status !== 'playing' && (
            <div className={styles.overlay} role="status">
              <div className={styles.headline}>
                {status === 'ready' && game.title}
                {status === 'paused' && 'Paused'}
                {status === 'over' && result?.headline}
              </div>
              <div className={styles.detail}>
                {suspended && 'Shift to Park to keep playing.'}
                {!suspended && status === 'ready' && game.howToPlay}
                {!suspended && status === 'over' && result?.detail}
              </div>
              <div className={styles.overlayActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={suspended}
                  onClick={primary}
                >
                  {status === 'ready' && 'Start'}
                  {status === 'paused' && 'Resume'}
                  {status === 'over' && 'Play again'}
                </button>
              </div>
            </div>
          )}
        </div>
        <TouchPad className={styles.rightPad} controls={game.rightControls} onTouch={handleTouch} />
      </div>
    </div>
  );
}
