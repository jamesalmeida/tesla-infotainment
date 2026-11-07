import { useEffect, useEffectEvent, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  AdvancedMarker,
  Map,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { getImagePath } from '../../utils/assetPaths';
import { MapButtons } from './MapButtons';
import { DEFAULT_CAR_POSITION, initialMapLayers, mapLayersReducer } from './mapLayers';
import {
  activeTripOf,
  initialNavState,
  navigateTarget,
  navReducer,
  searchedPlaceOf,
  type Route,
} from './navState';
import type { Place } from './place';
import { PlaceSearch } from './PlaceSearch';
import { TrafficLayer } from './TrafficLayer';
import styles from './MapNavigation.module.css';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Fall back to the original Tesla-style map ID when the env var is unset.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '2d1b7cd2cf277f7';

const CHARGER_SEARCH_RADIUS_METERS = 5000;
const LOCATE_TIMEOUT_MS = 10000;

function MarkerIcon({ name, size }: { name: string; size: number }) {
  return <img src={getImagePath(name)} width={size} height={size} alt="" />;
}

interface MapNoticeProps {
  role: 'alert' | 'status';
  onDismiss: () => void;
  children: ReactNode;
}

function MapNotice({ role, onDismiss, children }: MapNoticeProps) {
  return (
    <div
      role={role}
      className={`${styles.navStatus} ${styles.mapNotice} ${role === 'alert' ? styles.navError : ''}`}
    >
      <span>{children}</span>
      <button className={styles.noticeDismiss} aria-label="Dismiss" onClick={onDismiss}>
        <img src={getImagePath('icon-x.svg')} alt="" />
      </button>
    </div>
  );
}

/** The live map and its controls. Must render inside an APIProvider. */
export function MapStage() {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const routesLibrary = useMapsLibrary('routes');
  const [layers, dispatchLayers] = useReducer(mapLayersReducer, initialMapLayers);
  const { carPosition } = layers;
  const [query, setQuery] = useState('');
  const [nav, dispatchNav] = useReducer(navReducer, initialNavState);
  const routeRequestIdRef = useRef(0);

  // Voice commands reach the map through one event, so they don't need a shared context.
  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      if (detail?.query) setQuery(detail.query);
    };
    window.addEventListener('tesla:navigate', handleNavigate);
    return () => window.removeEventListener('tesla:navigate', handleNavigate);
  }, []);

  const handlePlaceSelect = (place: Place) => {
    setQuery(place.name);
    dispatchNav({ type: 'placeChosen', place });
    if (map) {
      map.panTo(place.location);
      map.setZoom(16);
    }
  };

  const clearSearch = () => {
    setQuery('');
    dispatchNav({ type: 'searchCleared' });
  };

  // Read on demand rather than held in state: the map owns its viewport, and this way
  // panning around doesn't re-render everything.
  const viewportCenter = () => map?.getCenter()?.toJSON() ?? carPosition;

  useEffect(() => {
    if (map && carPosition !== DEFAULT_CAR_POSITION) {
      map.panTo(carPosition);
      map.setZoom(16);
    }
  }, [map, carPosition]);

  const locateRequestId = layers.location === 'locating' ? layers.locationRequestId : null;
  useEffect(() => {
    if (locateRequestId === null) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        dispatchLayers({
          type: 'located',
          requestId: locateRequestId,
          position: { lat: coords.latitude, lng: coords.longitude },
        }),
      ({ code }) => dispatchLayers({ type: 'locateFailed', requestId: locateRequestId, code }),
      { timeout: LOCATE_TIMEOUT_MS },
    );
  }, [locateRequestId]);

  const searchChargers = useEffectEvent(
    async (library: google.maps.PlacesLibrary, requestId: number) => {
      try {
        const { places } = await library.Place.searchNearby({
          fields: ['id', 'location'],
          locationRestriction: { center: viewportCenter(), radius: CHARGER_SEARCH_RADIUS_METERS },
          includedPrimaryTypes: ['electric_vehicle_charging_station'],
          maxResultCount: 20,
        });
        dispatchLayers({ type: 'chargersLoaded', requestId, chargers: places });
      } catch (error) {
        console.error('Error fetching charger locations', error);
        dispatchLayers({ type: 'chargersFailed', requestId });
      }
    },
  );

  const chargerRequestId = layers.chargers === 'loading' ? layers.chargerRequestId : null;
  useEffect(() => {
    if (chargerRequestId !== null && placesLibrary) searchChargers(placesLibrary, chargerRequestId);
  }, [chargerRequestId, placesLibrary]);

  const startNavigation = () => {
    dispatchNav({ type: 'navigatePressed', requestId: ++routeRequestIdRef.current });
  };

  const fetchRoute = useEffectEvent(
    async (library: google.maps.RoutesLibrary, place: Place, requestId: number) => {
      const notFound = (reason: string) =>
        dispatchNav({ type: 'routeNotFound', requestId, reason });
      try {
        const { routes } = await library.Route.computeRoutes({
          origin: carPosition,
          destination: place.location,
          travelMode: 'DRIVING',
          fields: ['path', 'viewport'],
        });
        const route = routes?.[0];
        if (!route?.path?.length) {
          notFound(`No route found to ${place.name}.`);
          return;
        }
        dispatchNav({
          type: 'routeFound',
          requestId,
          route: {
            path: route.path.map(({ lat, lng }) => ({ lat, lng })),
            viewport: route.viewport ?? null,
          },
        });
      } catch (error) {
        console.error('Error fetching directions', error);
        notFound(`Couldn't get directions to ${place.name}.`);
      }
    },
  );

  const routing = nav.kind === 'routing' ? nav : null;
  useEffect(() => {
    if (routing && routesLibrary) fetchRoute(routesLibrary, routing.place, routing.requestId);
  }, [routing, routesLibrary]);

  const activeTrip = activeTripOf(nav);
  const activeRoute: Route | null = activeTrip?.route ?? null;
  useEffect(() => {
    if (map && activeRoute?.viewport) map.fitBounds(activeRoute.viewport);
  }, [map, activeRoute]);

  const endNavigation = () => {
    setQuery('');
    dispatchNav({ type: 'navigationEnded' });

    // Center the map on the current location
    if (map) {
      map.panTo(carPosition);
      map.setZoom(16);
    }
  };

  const toggleChargers = () => dispatchLayers({ type: 'chargersToggled' });
  const searchedPlace = searchedPlaceOf(nav);

  return (
    <>
      <div className={styles.mapOverlayWrapper}>
        <PlaceSearch
          placesLibrary={placesLibrary}
          query={query}
          onQueryChange={setQuery}
          onSelect={handlePlaceSelect}
          onClear={clearSearch}
          getLocationBias={viewportCenter}
        />
        <div className={styles.navPanel}>
          {/* A live region has to exist before its text does for the change to be announced. */}
          <div role="status">
            {nav.kind === 'routing' && (
              <p className={styles.navStatus}>Routing to {nav.place.name}…</p>
            )}
            {nav.kind === 'navigating' && (
              <p className={styles.navStatus}>Navigating to {nav.place.name}</p>
            )}
          </div>
          {nav.kind === 'routeFailed' && (
            <p role="alert" className={`${styles.navStatus} ${styles.navError}`}>
              {nav.reason}
              {activeTrip && ` Still navigating to ${activeTrip.place.name}.`}
            </p>
          )}
          {(navigateTarget(nav) || nav.kind === 'routing') && (
            <button
              className={`floatingBtn ${styles.navigateBtn}`}
              onClick={startNavigation}
              disabled={nav.kind === 'routing'}
            >
              {nav.kind === 'routing'
                ? 'Routing…'
                : nav.kind === 'routeFailed'
                  ? 'Try again'
                  : 'Navigate'}
            </button>
          )}
          {activeTrip && (
            <button className={`floatingBtn ${styles.endNavigateBtn}`} onClick={endNavigation}>
              End Navigation
            </button>
          )}
          {layers.locationError && (
            <MapNotice
              role="alert"
              onDismiss={() => dispatchLayers({ type: 'locationErrorDismissed' })}
            >
              {layers.locationError}
            </MapNotice>
          )}
          {layers.chargers === 'error' && (
            <MapNotice role="alert" onDismiss={toggleChargers}>
              Couldn't load chargers.
            </MapNotice>
          )}
          {layers.chargers === 'on' && layers.chargerResults.length === 0 && (
            <MapNotice role="status" onDismiss={toggleChargers}>
              No chargers found in this area.
            </MapNotice>
          )}
        </div>
        <MapButtons
          layers={layers}
          actions={{
            onCompass: () => map?.setHeading(0),
            onToggleMapStyle: () => dispatchLayers({ type: 'mapStyleToggled' }),
            onToggleTraffic: () => dispatchLayers({ type: 'trafficToggled' }),
            onLocate: () =>
              dispatchLayers({ type: 'locatePressed', supported: Boolean(navigator.geolocation) }),
            onToggleChargers: toggleChargers,
          }}
        />
      </div>
      <div className={styles.mapBackground}>
        <Map
          style={containerStyle}
          defaultCenter={DEFAULT_CAR_POSITION}
          defaultZoom={16}
          mapId={MAP_ID}
          mapTypeId={layers.mapStyle}
          disableDefaultUI
          gestureHandling="greedy"
        >
          {layers.traffic && <TrafficLayer />}
          <AdvancedMarker position={carPosition}>
            <MarkerIcon name="icon-car-marker.svg" size={40} />
          </AdvancedMarker>
          {searchedPlace && (
            <AdvancedMarker position={searchedPlace.location}>
              <MarkerIcon name="icon-map-marker.svg" size={40} />
            </AdvancedMarker>
          )}
          {activeRoute && (
            <Polyline path={activeRoute.path} strokeColor="#1976D2" strokeWeight={5} />
          )}
          {layers.chargerResults.map((charger) => (
            <AdvancedMarker key={charger.id} position={charger.location}>
              <Pin background="#e31937" borderColor="#a8102a" glyphColor="#ffffff" />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </>
  );
}
