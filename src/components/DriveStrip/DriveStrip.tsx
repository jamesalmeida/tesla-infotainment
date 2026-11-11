import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type { Gear } from '../../state/carState';
import styles from './DriveStrip.module.css';

// How far a drag has to travel before it asks for a gear.
export const DRIVE_STRIP_THRESHOLD_PX = 28;
const MAX_DRAG_PX = 72;

// Swipe up asks for Drive, down for Reverse. A small movement is a tap, not a shift.
export const gearFromDrag = (deltaY: number, threshold = DRIVE_STRIP_THRESHOLD_PX): Gear | null => {
  if (deltaY <= -threshold) return 'D';
  if (deltaY >= threshold) return 'R';
  return null;
};

export function DriveStrip() {
  const gear = useCar((state) => state.gear);
  const { selectGear } = useCarActions();
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const target = gearFromDrag(dragY);
  const shown = target ?? gear;

  const shift = (next: Gear | null) => {
    if (!next || next === gear) return;
    selectGear(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    setDragY(Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, delta)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const delta = event.clientY - startY.current;
    startY.current = null;
    setDragY(0);
    shift(gearFromDrag(delta));
  };

  const handlePointerCancel = () => {
    startY.current = null;
    setDragY(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      shift('D');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      shift('R');
    }
  };

  return (
    <div
      className={styles.strip}
      role="slider"
      aria-label="Drive strip"
      aria-valuetext={`${shown}. Swipe up for Drive, down for Reverse.`}
      aria-orientation="vertical"
      tabIndex={0}
      data-target={target ?? ''}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.chevron} aria-hidden="true">
        ▲
      </span>
      <span className={styles.knob} style={{ transform: `translateY(${dragY * 0.6}px)` }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 15h16l-1.5-4.5a2 2 0 0 0-1.9-1.4H7.4a2 2 0 0 0-1.9 1.4Z" />
          <circle cx="7" cy="16.5" r="1.6" />
          <circle cx="17" cy="16.5" r="1.6" />
        </svg>
        <strong>{shown}</strong>
      </span>
      <span className={styles.chevron} aria-hidden="true">
        ▼
      </span>
    </div>
  );
}
