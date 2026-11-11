import { getImagePath } from '../../utils/assetPaths';
import { MapButtons } from './MapButtons';
import { initialMapLayers } from './mapLayers';
import { describeMapsFailure, type MapsFailure } from './mapsAvailability';
import { PlaceSearch } from './PlaceSearch';
import styles from './MapNavigation.module.css';

const noop = () => {};
const noLocationBias = () => initialMapLayers.carPosition;

/** A hand-drawn stand-in for the map tiles, so the panel doesn't look broken. */
function StaticMapArt() {
  return (
    <svg
      className={styles.fallbackArt}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path fill="#c9dcea" d="M560 0h240v210c-70 30-120 10-170-30-50-40-60-110-70-180z" />
      <path fill="#d9e6d3" d="M40 370l150-30 60 120-90 90H70z" />
      <path fill="#d9e6d3" d="M470 330l130 20 20 110-140 20z" />
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <g strokeWidth="14">
          <path d="M-20 240C160 220 300 290 440 250s240 60 380 70" />
          <path d="M320-20c-20 150 40 260 10 380s30 200 20 260" />
        </g>
        <g strokeWidth="7">
          <path d="M-20 110h340M-20 500h820M180-20v640M640 230v390" />
          <path d="M330 120c120-20 200 10 250 90M440 250l40 250" />
        </g>
      </g>
    </svg>
  );
}

/** Takes the place of the map when Google Maps can't be used, with the controls disabled. */
export function MapFallback({ failure }: { failure: MapsFailure }) {
  const { title, detail } = describeMapsFailure(failure, import.meta.env.DEV);

  return (
    <>
      <div className={styles.mapOverlayWrapper}>
        <PlaceSearch
          disabled
          placesLibrary={null}
          query=""
          onQueryChange={noop}
          onSelect={noop}
          onClear={noop}
          getLocationBias={noLocationBias}
        />
        <MapButtons layers={initialMapLayers} />
      </div>
      <div className={styles.mapBackground}>
        <div className={styles.fallback}>
          <StaticMapArt />
          <div className={styles.fallbackNote}>
            <img src={getImagePath('icon-car-marker.svg')} width={40} height={40} alt="" />
            <h2>{title}</h2>
            <p>{detail}</p>
          </div>
        </div>
      </div>
    </>
  );
}
