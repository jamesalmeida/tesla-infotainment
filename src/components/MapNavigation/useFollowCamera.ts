import { useEffect, useEffectEvent } from 'react';
import type { CarTracker } from './carTracker';

const FOLLOW_ZOOM = 16;

/** Keeps the car in view as it moves. Runs off the tracker, so it never renders anything. */
export function useFollowCamera(
  map: google.maps.Map | null,
  tracker: CarTracker,
  following: boolean,
) {
  const moveCamera = useEffectEvent((zoom?: number) => {
    if (!map) return;
    map.moveCamera({ center: tracker.getPose().position, ...(zoom ? { zoom } : {}) });
  });

  // Coming back to the car also brings back the zoom a driver expects.
  useEffect(() => {
    if (!following) return;
    moveCamera(FOLLOW_ZOOM);
    return tracker.subscribe(() => moveCamera());
  }, [following, tracker, map]);
}
