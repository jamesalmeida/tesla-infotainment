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
  openDoors: number;
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
  const isParked = useCar((state) => state.gear === 'P');
  const openDoors = useCar((state) => Object.values(state.doors).filter(Boolean).length);
  const previous = useRef<SoundState>({ isLocked, compartment, openDoors });

  useEffect(() => {
    const before = previous.current;
    previous.current = { isLocked, compartment, openDoors };
    if (!enabled) return;

    if (isLocked && !before.isLocked && lockSound) playLockChime(volume);
    if (compartment !== before.compartment) playCarSound('door', volume);
    // Shifting is silent. The warning chime is for a door opened while the car is in gear.
    if (openDoors > before.openDoors && !isParked) playCarSound('doorAjar', volume);
  }, [compartment, enabled, isLocked, isParked, lockSound, openDoors, volume]);

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
