import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import { useDismiss } from '../../../../hooks/useDismiss';
import { MAX_ADJUSTMENT, type Adjustment } from '../../../../state/carState';
import styles from '../CarSettings.module.css';

// How far a wheel or trackpad has to travel for one step, as trackpads send many tiny events.
const WHEEL_STEP = 40;

const clamp = (value: number) => Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, value));

const ARROW_STEPS: Record<string, Adjustment> = {
  ArrowUp: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const BUTTONS = [
  { key: 'ArrowUp', label: 'Up', glyph: '↑' },
  { key: 'ArrowDown', label: 'Down', glyph: '↓' },
  { key: 'ArrowLeft', label: 'Left', glyph: '←' },
  { key: 'ArrowRight', label: 'Right', glyph: '→' },
];

interface AdjustmentPadProps {
  title: string;
  value: Adjustment;
  onChange: (value: Adjustment) => void;
  onClose: () => void;
  children?: ReactNode;
}

// Adjustment mode for anything with a position: on-screen arrows, the scroll wheel, or keys.
export function AdjustmentPad({ title, value, onChange, onClose, children }: AdjustmentPadProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelTravel = useRef({ x: 0, y: 0 });

  useDismiss(rootRef, true, onClose);
  useEffect(() => rootRef.current?.focus(), []);

  const move = useCallback(
    (step: Adjustment) => onChange({ x: clamp(value.x + step.x), y: clamp(value.y + step.y) }),
    [onChange, value],
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    // In adjustment mode the arrows belong to the pad, not the pedals.
    event.preventDefault();
    event.stopPropagation();
    move(step);
  };

  const handleWheel = (event: WheelEvent) => {
    const travel = wheelTravel.current;
    // Shift turns a mouse wheel sideways, which browsers report on either axis.
    travel.x += event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
    travel.y += event.shiftKey ? 0 : event.deltaY;
    const x = Math.trunc(travel.x / WHEEL_STEP);
    const y = Math.trunc(travel.y / WHEEL_STEP);
    if (!x && !y) return;
    travel.x -= x * WHEEL_STEP;
    travel.y -= y * WHEEL_STEP;
    // Scrolling away moves things up, as it does on the car's scroll wheel.
    move({ x, y: -y });
  };

  const percent = (position: number) => 50 + (position / MAX_ADJUSTMENT) * 40;

  return (
    <div
      ref={rootRef}
      className={styles['adjustment-modal']}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
    >
      <h2>{title}</h2>
      {children}
      <div className={styles['adjustment-body']}>
        <div
          className={styles['adjustment-view']}
          role="img"
          aria-label={`Position ${value.x} across, ${value.y} up`}
        >
          <span
            className={styles['adjustment-dot']}
            style={{ left: `${percent(value.x)}%`, top: `${percent(-value.y)}%` }}
          />
        </div>
        <div className={styles['adjustment-controls']}>
          {BUTTONS.map(({ key, label, glyph }) => (
            <button
              key={key}
              type="button"
              className={styles['adjustment-btn']}
              aria-label={label}
              onClick={() => move(ARROW_STEPS[key])}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
      <p className={styles['adjustment-hint']}>Use the arrows, scroll, or your arrow keys.</p>
      <button type="button" className={styles['close-btn']} onClick={onClose}>
        Done
      </button>
    </div>
  );
}
