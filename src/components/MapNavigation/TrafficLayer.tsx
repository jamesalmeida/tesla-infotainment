import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

/** Shows Google's traffic overlay for as long as this is mounted inside the map. */
export function TrafficLayer() {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLibrary) return;
    const layer = new mapsLibrary.TrafficLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, mapsLibrary]);

  return null;
}
