import { useState, useRef, useEffect } from 'react';
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
import { PlaceSearch } from './PlaceSearch';
import './MapNavigation.css';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Fall back to the original Tesla-style map ID when the env var is unset.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '2d1b7cd2cf277f7';

const DEFAULT_CENTER = { lat: 33.9210278, lng: -118.33005555555555 };
const CHARGER_SEARCH_RADIUS_METERS = 5000;

function MarkerIcon({ name, size }) {
  return <img src={getImagePath(name)} width={size} height={size} alt="" />;
}

export function MapNavigation({ onWifiClick }) {
  return (
    <APIProvider apiKey={API_KEY}>
      <MapNavigationContent onWifiClick={onWifiClick} />
    </APIProvider>
  );
}

function MapNavigationContent({ onWifiClick }) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const routesLibrary = useMapsLibrary('routes');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [mapType, setMapType] = useState('roadmap');
  const trafficLayerRef = useRef(null);
  const [isLocating, setIsLocating] = useState(false);
  const [chargers, setChargers] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handlePlaceSelect = ({ name, location }) => {
    setQuery(name);
    setSearchResult(location);
    if (map) {
      map.panTo(location);
      map.setZoom(16);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResult(null);
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

  const calculateRoute = async () => {
    if (!routesLibrary || !searchResult) return;
    try {
      const { routes } = await routesLibrary.Route.computeRoutes({
        origin: center,
        destination: searchResult,
        travelMode: 'DRIVING',
        fields: ['path', 'viewport'],
      });
      const route = routes?.[0];
      if (!route?.path) {
        console.error('No route found');
        return;
      }
      setRoutePath(route.path.map(({ lat, lng }) => ({ lat, lng })));
      setIsNavigating(true);
      if (map && route.viewport) {
        map.fitBounds(route.viewport);
      }
    } catch (error) {
      console.error('Error fetching directions', error);
    }
  };

  const endNavigation = () => {
    setIsNavigating(false);
    setRoutePath(null);
    clearSearch();

    // Center the map on the current location
    if (map) {
      map.panTo(center);
      map.setZoom(16);
    }
  };

  return (
    <div className="MapNavigation">
      <div className="topMenuBar">
        <div className="carLockWrapper">
          <CarLock />
        </div>
        <UserProfile />
        <div className="wifiStatus">
          <img src={getImagePath('icon-wifi.svg')} alt="Wifi Status" onClick={onWifiClick} />
        </div>
        <div className="clock">
          <Clock />
        </div>
        <div className="outsideTemp">
          <OutsideTemp />
        </div>
        <div className="airbagStatus no-select">
          <img src={getImagePath('icon-airbags.svg')} alt="Airbag Status" />
          <div className="airbagStatusText">
            PASSENGER AIRBAG&nbsp;<span className="airbagStatusOff">OFF</span>
          </div>
        </div>
      </div>
      <div className="mapOverlayWrapper">
        <PlaceSearch
          placesLibrary={placesLibrary}
          query={query}
          onQueryChange={setQuery}
          onSelect={handlePlaceSelect}
          onClear={clearSearch}
          locationBias={center}
        />
        {searchResult && !isNavigating && (
          <button className="floatingBtn navigateBtn" onClick={calculateRoute}>
            Navigate
          </button>
        )}
        {isNavigating && (
          <button className="floatingBtn endNavigateBtn" onClick={endNavigation}>
            End Navigation
          </button>
        )}
        <div className="floatingRightBtnsWrapper">
          <button className="floatingBtn squareBtn compassDirection" onClick={handleCompass}>
            <img className="icon-compass" src={getImagePath('icon-compass.svg')} alt="Compass" />
          </button>
          <div className="floatingRightBtnColumn">
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
      <div className="mapBackground">
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
          {searchResult && !isNavigating && (
            <AdvancedMarker position={searchResult}>
              <MarkerIcon name="icon-map-marker.svg" size={40} />
            </AdvancedMarker>
          )}
          {routePath && <Polyline path={routePath} strokeColor="#1976D2" strokeWeight={5} />}
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
