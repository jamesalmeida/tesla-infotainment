import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { getImagePath } from '../../utils/assetPaths';
import type { CarTracker } from './carTracker';
import { useCarPose } from './useCarTracking';
import { useMapHeading } from './useMapHeading';

const MARKER_SIZE = 40;

/** The car, pointing the way it's heading. Re-renders alone, so the map doesn't. */
export function CarMarker({ tracker }: { tracker: CarTracker }) {
  const { position, heading } = useCarPose(tracker);
  const mapHeading = useMapHeading(useMap());

  return (
    <AdvancedMarker position={position}>
      <img
        src={getImagePath('icon-car-marker.svg')}
        width={MARKER_SIZE}
        height={MARKER_SIZE}
        alt=""
        data-testid="car-icon"
        style={{ transform: `rotate(${heading - mapHeading}deg)` }}
      />
    </AdvancedMarker>
  );
}
