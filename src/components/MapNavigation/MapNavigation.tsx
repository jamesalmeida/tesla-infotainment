import { useEffect, useEffectEvent, useReducer, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { getImagePath } from '../../utils/assetPaths';
import CarLock from '../CarLock/CarLock';
import Clock from '../Clock/Clock';
import OutsideTemp from '../OutsideTemp/OutsideTemp';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import UserProfile from '../UserProfile/UserProfile';
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
import styles from './MapNavigation.module.css';

type MapType = 'roadmap' | 'satellite';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Fall back to the original Tesla-style map ID when the env var is unset.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '2d1b7cd2cf277f7';

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 33.9210278, lng: -118.33005555555555 };
const CHARGER_SEARCH_RADIUS_METERS = 5000;

function MarkerIcon({ name, size }: { name: string; size: number }) {
  return <img src={getImagePath(name)} width={size} height={size} alt="" />;
}

interface MapNavigationProps {
  onWifiClick: () => void;
}

export function MapNavigation({ onWifiClick }: MapNavigationProps) {
  return (
    <APIProvider apiKey={API_KEY}>
      <MapNavigationContent onWifiClick={onWifiClick} />
    </APIProvider>
  );
}

function MapNavigationContent({ onWifiClick }: MapNavigationProps) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const routesLibrary = useMapsLibrary('routes');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [mapType, setMapType] = useState<MapType>('roadmap');
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [chargers, setChargers] = useState<google.maps.places.Place[]>([]);
  const [query, setQuery] = useState('');
  const [nav, dispatchNav] = useReducer(navReducer, initialNavState);
  const routeRequestIdRef = useRef(0);

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

  const handleCompass = () => {
    if (map) {
      map.setHeading(0);
    }
  };

  const toggleMapType = () => {
    setMapType((prevType) => (prevType === 'roadmap' ? 'satellite' : 'roadmap'));
  };

  const toggleTraffic = () => {
    if (map) {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
        trafficLayerRef.current = null;
      } else {
        if (mapType === 'satellite') {
          setMapType('roadmap');
        }
        const newTrafficLayer = new window.google.maps.TrafficLayer();
        newTrafficLayer.setMap(map);
        trafficLayerRef.current = newTrafficLayer;
      }
    }
  };

  useEffect(() => {
    if (map && mapType === 'roadmap' && trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      const newTrafficLayer = new window.google.maps.TrafficLayer();
      newTrafficLayer.setMap(map);
      trafficLayerRef.current = newTrafficLayer;
    }
  }, [map, mapType]);

  const handleLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true); // Start loading
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(pos);
          if (map) {
            map.panTo(pos);
            map.setZoom(16);
          }
          setIsLocating(false); // Stop loading
        },
        () => {
          console.log('Error: The Geolocation service failed.');
          setIsLocating(false); // Stop loading even if there's an error
        },
        { timeout: 10000 }, // Set a timeout of 10 seconds
      );
    } else {
      console.log("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleChargerLocations = async () => {
    if (!placesLibrary) return;
    try {
      const { places } = await placesLibrary.Place.searchNearby({
        fields: ['id', 'location'],
        locationRestriction: { center, radius: CHARGER_SEARCH_RADIUS_METERS },
        includedPrimaryTypes: ['electric_vehicle_charging_station'],
        maxResultCount: 20,
      });
      setChargers(places);
    } catch (error) {
      console.error('Error fetching charger locations', error);
    }
  };

  const startNavigation = () => {
    dispatchNav({ type: 'navigatePressed', requestId: ++routeRequestIdRef.current });
  };

  const fetchRoute = useEffectEvent(
    async (library: google.maps.RoutesLibrary, place: Place, requestId: number) => {
      const notFound = (reason: string) =>
        dispatchNav({ type: 'routeNotFound', requestId, reason });
      try {
        const { routes } = await library.Route.computeRoutes({
          origin: center,
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
      map.panTo(center);
      map.setZoom(16);
    }
  };

  const searchedPlace = searchedPlaceOf(nav);

  return (
    <div className={styles.MapNavigation}>
      <div className={styles.topMenuBar}>
        <div className={styles.carLockWrapper}>
          <CarLock />
        </div>
        <UserProfile />
        <div className={styles.wifiStatus}>
          <img src={getImagePath('icon-wifi.svg')} alt="Wifi Status" onClick={onWifiClick} />
        </div>
        <div className="clock">
          <Clock />
        </div>
        <div className={styles.outsideTemp}>
          <OutsideTemp />
        </div>
        <div className={`${styles.airbagStatus} no-select`}>
          <img src={getImagePath('icon-airbags.svg')} alt="Airbag Status" />
          <div className={styles.airbagStatusText}>
            PASSENGER AIRBAG&nbsp;<span className={styles.airbagStatusOff}>OFF</span>
          </div>
        </div>
      </div>
      <div className={styles.mapOverlayWrapper}>
        <PlaceSearch
          placesLibrary={placesLibrary}
          query={query}
          onQueryChange={setQuery}
          onSelect={handlePlaceSelect}
          onClear={clearSearch}
          locationBias={center}
        />
        <div className={styles.navPanel}>
          {nav.kind === 'routing' && (
            <p role="status" className={styles.navStatus}>
              Routing to {nav.place.name}…
            </p>
          )}
          {nav.kind === 'routeFailed' && (
            <p role="alert" className={`${styles.navStatus} ${styles.navError}`}>
              {nav.reason}
              {activeTrip && ` Still navigating to ${activeTrip.place.name}.`}
            </p>
          )}
          {nav.kind === 'navigating' && (
            <p role="status" className={styles.navStatus}>
              Navigating to {nav.place.name}
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
        </div>
        <div className={styles.floatingRightBtnsWrapper}>
          <button
            className={`floatingBtn squareBtn ${styles.compassDirection}`}
            onClick={handleCompass}
          >
            <img
              className={styles['icon-compass']}
              src={getImagePath('icon-compass.svg')}
              alt="Compass"
            />
          </button>
          <div className={styles.floatingRightBtnColumn}>
            <button className="floatingBtn squareBtn btnGroup" onClick={toggleMapType}>
              <img className="icon" src={getImagePath('icon-globe.svg')} alt="Map Style" />
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={toggleTraffic}>
              <img className="icon" src={getImagePath('icon-traffic.svg')} alt="Toggle Traffic" />
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={handleLocation}>
              {isLocating ? (
                <LoadingSpinner />
              ) : (
                <img className="icon" src={getImagePath('icon-map-marker.svg')} alt="Location" />
              )}
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={handleChargerLocations}>
              <img
                className="icon"
                src={getImagePath('icon-charger-locations.svg')}
                alt="Charging Locations"
              />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.mapBackground}>
        <Map
          style={containerStyle}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={16}
          mapId={MAP_ID}
          mapTypeId={mapType}
          disableDefaultUI
          gestureHandling="greedy"
        >
          <AdvancedMarker position={center}>
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
          {chargers.map((charger) => (
            <AdvancedMarker key={charger.id} position={charger.location}>
              <Pin background="#e31937" borderColor="#a8102a" glyphColor="#ffffff" />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </div>
  );
}
