import { useEffect, type RefObject } from 'react';

// Closes a popover on Escape or on a press outside it.
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isOpen, onDismiss]);
}
