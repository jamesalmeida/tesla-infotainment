import { useEffect, useEffectEvent } from 'react';
import type { CarTracker } from './carTracker';
import type { MapFocus } from '../ParkView/parkMapFocus';

const FOLLOW_ZOOM = 16;

// The centre that puts `position` at `focus` on screen instead of in the middle of the map.
function centreFor(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  focus: MapFocus | null,
): google.maps.LatLngLiteral | google.maps.LatLng {
  if (!focus) return position;
  const projection = map.getProjection();
  const zoom = map.getZoom();
  if (!projection || zoom === undefined) return position;
  const box = map.getDiv().getBoundingClientRect();
  const scale = 2 ** zoom;
  // Screen offset of the car from the middle, turned back by the map's heading.
  const dx = focus.x - (box.left + box.width / 2);
  const dy = focus.y - (box.top + box.height / 2);
  const heading = ((map.getHeading() ?? 0) * Math.PI) / 180;
  const worldX = dx * Math.cos(heading) - dy * Math.sin(heading);
  const worldY = dx * Math.sin(heading) + dy * Math.cos(heading);
  const point = projection.fromLatLngToPoint(position);
  if (!point) return position;
  return (
    projection.fromPointToLatLng(
      new google.maps.Point(point.x - worldX / scale, point.y - worldY / scale),
    ) ?? position
  );
}

/**
 * Keeps the car in view as it moves. Runs off the tracker, so it never renders anything.
 * With a focus point (Park View's corner of map), the car sits there instead of the middle.
 */
export function useFollowCamera(
  map: google.maps.Map | null,
  tracker: CarTracker,
  following: boolean,
  focus: MapFocus | null = null,
) {
  const moveCamera = useEffectEvent((zoom?: number) => {
    if (!map) return;
    const center = centreFor(map, tracker.getPose().position, focus);
    map.moveCamera({ center, ...(zoom ? { zoom } : {}) });
    // The projection needs the zoom to have landed, so a new zoom is placed twice.
    if (zoom && focus) {
      map.moveCamera({ center: centreFor(map, tracker.getPose().position, focus) });
    }
  });

  // Coming back to the car also brings back the zoom a driver expects. Park View always
  // brings the car back into its corner.
  const active = following || focus !== null;
  useEffect(() => {
    if (!active) return;
    moveCamera(FOLLOW_ZOOM);
    return tracker.subscribe(() => moveCamera());
  }, [active, tracker, map, focus]);
}
