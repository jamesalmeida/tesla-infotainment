import { useState } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import type { MapLayersState } from './mapLayers';
import { MapOptions } from './MapOptions';
import styles from './MapNavigation.module.css';

export interface MapButtonActions {
  onCompass: () => void;
  onToggleMapStyle: () => void;
  onToggleTraffic: () => void;
  onLocate: () => void;
  onToggleChargers: () => void;
  onToggleLiveLocation: () => void;
}

interface MapButtonsProps {
  layers: Pick<MapLayersState, 'mapStyle' | 'traffic' | 'chargers' | 'location' | 'liveLocation'>;
  /** Leave out to show the buttons disabled, for when there is no map to act on. */
  actions?: MapButtonActions;
}

const buttonClass = (state?: 'on' | 'error') =>
  [
    'floatingBtn squareBtn btnGroup',
    state === 'on' && styles.layerOn,
    state === 'error' && styles.layerError,
  ]
    .filter(Boolean)
    .join(' ');

export function MapButtons({ layers, actions }: MapButtonsProps) {
  const { mapStyle, traffic, chargers, location, liveLocation } = layers;
  const disabled = !actions;
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <div className={styles.floatingRightBtnsWrapper}>
      <button
        className={`floatingBtn squareBtn ${styles.compassDirection}`}
        aria-label="Reset map heading"
        disabled={disabled}
        onClick={actions?.onCompass}
      >
        <img className={styles['icon-compass']} src={getImagePath('icon-compass.svg')} alt="" />
      </button>
      <div className={styles.floatingRightBtnColumn}>
        <button
          className={buttonClass(optionsOpen ? 'on' : undefined)}
          aria-label="Map options"
          aria-expanded={optionsOpen}
          disabled={disabled}
          onClick={() => setOptionsOpen(!optionsOpen)}
        >
          <img className="icon" src={getImagePath('icon-gear.svg')} alt="" />
        </button>
        <button
          className={buttonClass(mapStyle === 'satellite' ? 'on' : undefined)}
          aria-label="Satellite map"
          aria-pressed={mapStyle === 'satellite'}
          disabled={disabled}
          onClick={actions?.onToggleMapStyle}
        >
          <img className="icon" src={getImagePath('icon-globe.svg')} alt="" />
        </button>
        <button
          className={buttonClass(traffic ? 'on' : undefined)}
          aria-label="Traffic"
          aria-pressed={traffic}
          disabled={disabled}
          onClick={actions?.onToggleTraffic}
        >
          <img className="icon" src={getImagePath('icon-traffic.svg')} alt="" />
        </button>
        <button
          className={buttonClass(
            location === 'error' ? 'error' : location === 'locating' ? 'on' : undefined,
          )}
          aria-label="Locate car"
          aria-pressed={location === 'locating'}
          aria-busy={location === 'locating'}
          disabled={disabled}
          onClick={actions?.onLocate}
        >
          {location === 'locating' ? (
            <LoadingSpinner />
          ) : (
            <img className="icon" src={getImagePath('icon-map-marker.svg')} alt="" />
          )}
        </button>
        <button
          className={buttonClass(
            chargers === 'error' ? 'error' : chargers === 'off' ? undefined : 'on',
          )}
          aria-label="Charging locations"
          aria-pressed={chargers !== 'off'}
          aria-busy={chargers === 'loading'}
          disabled={disabled}
          onClick={actions?.onToggleChargers}
        >
          {chargers === 'loading' ? (
            <LoadingSpinner />
          ) : (
            <img className="icon" src={getImagePath('icon-charger-locations.svg')} alt="" />
          )}
        </button>
      </div>
      {optionsOpen && actions && (
        <MapOptions
          liveLocation={liveLocation}
          onToggleLiveLocation={actions.onToggleLiveLocation}
        />
      )}
    </div>
  );
}
