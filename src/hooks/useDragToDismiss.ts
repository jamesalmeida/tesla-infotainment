import { useCallback, useRef, useState, type PointerEvent, type RefObject } from 'react';

// How far the pointer must travel before a press counts as a drag.
const DRAG_START_PX = 4;
const DISMISS_DISTANCE_PX = 50;
// A quick flick dismisses even if it didn't travel far.
const DISMISS_VELOCITY_PX_PER_MS = 0.5;

type Gesture =
  | { phase: 'idle' }
  | { phase: 'pressed'; pointerId: number; startY: number; startTime: number }
  | { phase: 'dragging'; pointerId: number; startY: number; startTime: number; offset: number };

// Drag-down gesture for the handle only, so nothing inside the panel can start it.
// The offset is written straight to the panel so a drag doesn't re-render the open app.
export function useDragToDismiss(panelRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const gestureRef = useRef<Gesture>({ phase: 'idle' });
  const [isDragging, setIsDragging] = useState(false);

  const reset = useCallback(() => {
    gestureRef.current = { phase: 'idle' };
    setIsDragging(false);
    if (panelRef.current) panelRef.current.style.transform = '';
  }, [panelRef]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gestureRef.current = {
      phase: 'pressed',
      pointerId: event.pointerId,
      startY: event.clientY,
      startTime: event.timeStamp,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (gesture.phase === 'idle' || gesture.pointerId !== event.pointerId) return;

    const offset = Math.max(0, event.clientY - gesture.startY);
    if (gesture.phase === 'pressed') {
      if (offset < DRAG_START_PX) return;
      setIsDragging(true);
    }
    gestureRef.current = { ...gesture, phase: 'dragging', offset };
    if (panelRef.current) panelRef.current.style.transform = `translateY(${offset}px)`;
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (gesture.phase === 'dragging' && gesture.pointerId === event.pointerId) {
      const elapsed = Math.max(1, event.timeStamp - gesture.startTime);
      const isFlick = gesture.offset / elapsed > DISMISS_VELOCITY_PX_PER_MS;
      if (gesture.offset > DISMISS_DISTANCE_PX || isFlick) onDismiss();
    }
    reset();
  };

  return {
    isDragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  };
}
