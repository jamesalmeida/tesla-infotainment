import { useEffect, useState } from 'react';
import { useCar } from '../state/CarStateContext';

type TextTarget = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'password', 'tel', 'url', 'number']);

// Optional realism for a desktop kiosk. Phones and tablets keep their own keyboard, so this
// is off by default and only listens while the setting is on.
export function useOnScreenKeyboard() {
  const enabled = useCar((state) => state.settings.onScreenKeyboard);
  const [target, setTarget] = useState<TextTarget | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      return;
    }

    const handleFocus = (event: FocusEvent) => {
      const element = event.target;
      if (element instanceof HTMLTextAreaElement) {
        setTarget(element);
      } else if (element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type)) {
        setTarget(element);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [enabled]);

  return { target: target?.isConnected ? target : null, close: () => setTarget(null) };
}
