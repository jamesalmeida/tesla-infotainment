import { useEffect, useEffectEvent } from 'react';
import type { CarTracker } from './carTracker';
import type { Route } from './routeData';

// The end of a route is rarely reached exactly, and the last metres don't need driving.
const ARRIVAL_METERS = 20;

/** Watches the tracker for the milestones of a trip. Only those reach React state. */
export function useTripProgress(tracker: CarTracker, route: Route | null, onArrive: () => void) {
  const arrive = useEffectEvent(onArrive);

  useEffect(() => {
    if (!route || route.pathMeters === 0) return;
    return tracker.subscribe(() => {
      const { along } = tracker.getPose();
      if (along !== null && along >= route.pathMeters - ARRIVAL_METERS) arrive();
    });
  }, [tracker, route]);
}
