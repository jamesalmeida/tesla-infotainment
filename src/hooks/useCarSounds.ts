import { useEffect, useRef } from 'react';
import { playCarSound, playLockChime } from '../apps/carSounds';
import { useCar } from '../state/CarStateContext';

interface SoundState {
  isLocked: boolean;
  compartment: string | null;
  signal: string;
  hazards: boolean;
  gear: string;
}

// Short sounds for things that happen to the car. The samples are local, so this never
// waits on the network, and everything stops when Car Sounds is muted.
export function useCarSounds() {
  const enabled = useCar((state) => state.settings.soundsEnabled);
  const lockSound = useCar((state) => state.settings.lockSound);
  const volume = useCar((state) => state.volume);
  const isLocked = useCar((state) => state.isLocked);
  const compartment = useCar((state) => state.openCompartment);
  const signal = useCar((state) => state.signal);
  const hazards = useCar((state) => state.hazards);
  const gear = useCar((state) => state.gear);
  const previous = useRef<SoundState>({ isLocked, compartment, signal, hazards, gear });

  useEffect(() => {
    const before = previous.current;
    previous.current = { isLocked, compartment, signal, hazards, gear };
    if (!enabled) return;

    if (isLocked && !before.isLocked && lockSound) playLockChime(volume);
    if (compartment !== before.compartment) playCarSound('door', volume);
    if (signal !== before.signal && signal !== 'off') playCarSound('indicator', volume);
    if (hazards && !before.hazards) playCarSound('indicator', volume);
    if ((gear === 'D' || gear === 'R') && before.gear === 'P') playCarSound('seatbelt', volume);
  }, [compartment, enabled, gear, hazards, isLocked, lockSound, signal, volume]);
}
