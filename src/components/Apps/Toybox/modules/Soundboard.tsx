import { useEffect, useRef, useState } from 'react';
import { Callout, ui } from '../../../../apps/ui/AppScreen';
import { useCar } from '../../../../state/CarStateContext';
import { gainFor, soundLength, SOUNDS, type Sound } from './sounds';
import styles from './Soundboard.module.css';

const audioContextClass = () => (typeof window === 'undefined' ? undefined : window.AudioContext);

export function Soundboard() {
  const volume = useCar((state) => state.volume);
  const contextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canPlay = Boolean(audioContextClass());

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      contextRef.current?.close().catch(() => {});
    },
    [],
  );

  const play = (sound: Sound) => {
    const AudioContextClass = audioContextClass();
    if (!AudioContextClass) return;
    contextRef.current ??= new AudioContextClass();
    const context = contextRef.current;
    context.resume().catch(() => {});

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound.wave;
    gain.gain.value = gainFor(volume);
    oscillator.connect(gain).connect(context.destination);

    let at = context.currentTime;
    sound.steps.forEach(({ frequency, seconds }) => {
      gain.gain.setValueAtTime(frequency ? gainFor(volume) : 0, at);
      if (frequency) oscillator.frequency.setValueAtTime(frequency, at);
      at += seconds;
    });
    oscillator.start();
    oscillator.stop(at);

    setPlaying(sound.id);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPlaying(null), soundLength(sound) * 1000);
  };

  return (
    <div className={ui.stack}>
      {!canPlay && <Callout tone="warning">This browser can&apos;t synthesise sound.</Callout>}
      <div className={styles.pads}>
        {SOUNDS.map((sound) => (
          <button
            key={sound.id}
            type="button"
            disabled={!canPlay}
            className={`${styles.pad} ${playing === sound.id ? styles.padActive : ''}`}
            onClick={() => play(sound)}
          >
            {sound.label}
          </button>
        ))}
      </div>
      <p className={ui.muted}>Follows the car&apos;s volume, now at {volume}%.</p>
    </div>
  );
}
