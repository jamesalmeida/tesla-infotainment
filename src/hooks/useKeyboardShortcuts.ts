import { useEffect } from 'react';
import { useCarActions } from '../state/CarStateContext';

// Shift shortcuts from the README. Gear and music shortcuts live in GearSelect and MusicPanel.
export function useKeyboardShortcuts() {
  const actions = useCarActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName.toLowerCase() === 'input' || !event.shiftKey) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          actions.toggleLeftSignal();
          break;
        case 'ArrowRight':
          event.preventDefault();
          actions.toggleRightSignal();
          break;
        case 'C':
          event.preventDefault();
          actions.toggleCamera();
          break;
        case 'H':
          event.preventDefault();
          actions.toggleHazards();
          break;
        case 'F':
          actions.toggleFrunk();
          break;
        case 'T':
          actions.toggleTrunk();
          break;
        case 'M':
          event.preventDefault(); // Prevent 'M' from being typed
          document.getElementById('navigateTo')?.focus();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
