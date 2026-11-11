import { useEffect, useRef } from 'react';
import {
  playCarSound,
  playLockChime,
  setIndicatorVolume,
  startIndicator,
  stopIndicator,
} from '../apps/carSounds';
import { useCar } from '../state/CarStateContext';

interface SoundState {
  isLocked: boolean;
  compartment: string | null;
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
  const isIndicating = useCar((state) => state.signal !== 'off' || state.hazards);
  const gear = useCar((state) => state.gear);
  const previous = useRef<SoundState>({ isLocked, compartment, gear });

  useEffect(() => {
    const before = previous.current;
    previous.current = { isLocked, compartment, gear };
    if (!enabled) return;

    if (isLocked && !before.isLocked && lockSound) playLockChime(volume);
    if (compartment !== before.compartment) playCarSound('door', volume);
    if ((gear === 'D' || gear === 'R') && before.gear === 'P') playCarSound('seatbelt', volume);
  }, [compartment, enabled, gear, isLocked, lockSound, volume]);

  // The tick follows the blinker: on while any signal or the hazards are on, off the moment
  // they all are. Volume is applied separately, so changing it doesn't restart the loop.
  const shouldTick = enabled && isIndicating;
  useEffect(() => {
    if (!shouldTick) return;
    startIndicator(volume);
    return stopIndicator;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volume is applied below
  }, [shouldTick]);

  useEffect(() => {
    setIndicatorVolume(volume);
  }, [volume]);
}
