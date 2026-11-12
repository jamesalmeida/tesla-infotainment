import { useEffect, type RefObject } from 'react';

type ElementRef = RefObject<HTMLElement | null>;

// Closes a popover on Escape or on a press outside it. A popover drawn elsewhere, in a
// portal, passes its own ref too, so a press on it still counts as inside.
export function useDismiss(ref: ElementRef | ElementRef[], isOpen: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const refs = Array.isArray(ref) ? ref : [ref];

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const elements = refs.map((each) => each.current).filter((element) => element !== null);
      if (elements.length > 0 && !elements.some((element) => element.contains(target))) {
        onDismiss();
      }
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
