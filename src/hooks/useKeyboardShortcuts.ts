import { useEffect } from 'react';
import { useCarActions } from '../state/CarStateContext';
import { findShortcut } from './shortcuts';

// The app's one global key listener. The shortcuts themselves are in shortcuts.ts.
export function useKeyboardShortcuts() {
  const actions = useCarActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = findShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      shortcut.run(actions);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
