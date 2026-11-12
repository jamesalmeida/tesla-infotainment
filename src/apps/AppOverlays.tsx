import { useEffect } from 'react';
import { CallBanner } from '../components/Apps/Phone/CallBanner';
import { useCar } from '../state/CarStateContext';
import { useEnergySampler } from './energyHistory';
import { setPlaybackVolume } from './mediaLibrary';

// What apps need to keep doing, or to show, while their own screen is closed.
export function AppOverlays() {
  const volume = useCar((state) => state.volume);

  useEnergySampler();
  useEffect(() => setPlaybackVolume(volume), [volume]);

  return (
    <>
      <CallBanner />
    </>
  );
}
