import { useEffect, useState } from 'react';

const isAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Reads each new instruction aloud once switched on. Silent where speech doesn't exist. */
export function useVoiceGuidance(instruction: string | null) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on || !instruction || !isAvailable()) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(instruction));
  }, [on, instruction]);

  useEffect(
    () => () => {
      if (isAvailable()) window.speechSynthesis.cancel();
    },
    [],
  );

  return { available: isAvailable(), on, toggle: () => setOn(!on) };
}
