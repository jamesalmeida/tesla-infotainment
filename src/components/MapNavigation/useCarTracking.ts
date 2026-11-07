import { useEffect, useEffectEvent, useState, useSyncExternalStore } from 'react';
import { useCarStore } from '../../state/CarStateContext';
import { createCarTracker, type CarPose, type CarTracker } from './carTracker';
import type { LiveLocation } from './mapLayers';

const METERS_PER_MILE = 1609.344;
const LIVE_LOCATION_MAX_AGE_MS = 1000;

interface CarTrackingOptions {
  carPosition: google.maps.LatLngLiteral;
  routePath: google.maps.LatLngLiteral[] | null;
  liveLocation: LiveLocation;
  onLiveFix: () => void;
  onLiveError: (code: number) => void;
}

/** Keeps a car tracker fed from the simulator, or the device, and the active route. */
export function useCarTracking({
  carPosition,
  routePath,
  liveLocation,
  onLiveFix,
  onLiveError,
}: CarTrackingOptions): CarTracker {
  const store = useCarStore();
  const [tracker] = useState(() => createCarTracker(carPosition));

  useEffect(() => () => tracker.dispose(), [tracker]);
  useEffect(() => tracker.jumpTo(carPosition), [tracker, carPosition]);
  useEffect(() => tracker.followRoute(routePath), [tracker, routePath]);

  // The simulator integrates speed into the odometer, so the distance it reports is exactly
  // what the trip meter and battery counted. Subscribing directly means a tick re-renders
  // nothing here.
  const simulating = liveLocation === 'off';
  useEffect(() => {
    if (!simulating) return;
    let lastMiles = store.getState().odometerMiles;
    return store.subscribe(() => {
      const { odometerMiles, gear } = store.getState();
      const miles = odometerMiles - lastMiles;
      lastMiles = odometerMiles;
      if (miles > 0 && gear !== 'R') tracker.advance(miles * METERS_PER_MILE);
    });
  }, [store, tracker, simulating]);

  const announceFix = useEffectEvent(onLiveFix);
  const announceError = useEffectEvent(onLiveError);
  useEffect(() => {
    if (simulating) return;
    const { geolocation } = navigator;
    const watchId = geolocation.watchPosition(
      ({ coords }) => {
        tracker.applyFix({ lat: coords.latitude, lng: coords.longitude }, coords.heading);
        announceFix();
      },
      ({ code }) => announceError(code),
      { enableHighAccuracy: true, maximumAge: LIVE_LOCATION_MAX_AGE_MS },
    );
    return () => geolocation.clearWatch(watchId);
  }, [tracker, simulating]);

  return tracker;
}

/** The tracker's position, re-rendering at its throttled rate. For small components only. */
export const useCarPose = (tracker: CarTracker): CarPose =>
  useSyncExternalStore(tracker.subscribe, tracker.getPose);
