import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, DirectionsRenderer } from '@react-google-maps/api';
import CarLock from '../CarLock/CarLock';
import Clock from '../Clock/Clock';
import OutsideTemp from '../OutsideTemp/OutsideTemp';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import UserProfile from '../UserProfile/UserProfile';
import './MapNavigation.css';
import './MapNavigationAutocomplete.css'; // Add this new import

const containerStyle = {
  width: '100%',
  height: '100%'
};

const customMapStyles = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  }
];

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
// const MAP_ID = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID; // This wasn't working, so hardcoding for now
const MAP_ID = '2d1b7cd2cf277f7';

// Define libraries array outside of the component
const libraries = ['places'];

export function MapNavigation() {
  const [center, setCenter] = useState({ lat: 33.9210278, lng: -118.33005555555555 }); // Default location
  const [mapType, setMapType] = useState('roadmap');
  const [trafficLayer, setTrafficLayer] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [chargers, setChargers] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const mapRef = useRef(null);
  const [markerIcon, setMarkerIcon] = useState(null);
  const [directions, setDirections] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef(null);  // New ref for the input element
  const [inputValue, setInputValue] = useState('');  // New state for input value

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: libraries // Use the constant libraries array
  });

  useEffect(() => {
    if (isLoaded && window.google) {
      setMarkerIcon({
        url: getImagePath("icon-car-marker.svg"),
        scaledSize: new window.google.maps.Size(40, 40)
      });
      setDirectionsService(new window.google.maps.DirectionsService());
    }
  }, [isLoaded]);

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = (autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newSearchResult = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setSearchResult(newSearchResult);
        
        // Prioritize name, then formatted_address, then construct from address_components
        let newValue = place.name;
        if (!newValue && place.formatted_address) {
          newValue = place.formatted_address;
        } else if (!newValue && place.address_components) {
          newValue = place.address_components
            .map(component => component.long_name)
            .join(', ');
        }

        setInputValue(newValue);
        if (inputRef.current) {
          inputRef.current.value = newValue;
        }
        if (mapRef.current) {
          mapRef.current.panTo(newSearchResult);
          mapRef.current.setZoom(16);
        }
      }
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const clearInput = () => {
    setInputValue('');
    setSearchResult(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  const handleCompass = () => {
    if (mapRef.current) {
      mapRef.current.setHeading(0);
    }
  };

  const toggleMapType = () => {
    setMapType(prevType => prevType === 'roadmap' ? 'satellite' : 'roadmap');
  };

  const toggleTraffic = () => {
    if (mapRef.current) {
      if (trafficLayer) {
        trafficLayer.setMap(null);
        setTrafficLayer(null);
      } else {
        if (mapType === 'satellite') {
          setMapType('roadmap');
        }
        const newTrafficLayer = new window.google.maps.TrafficLayer();
        newTrafficLayer.setMap(mapRef.current);
        setTrafficLayer(newTrafficLayer);
      }
    }
  };

  useEffect(() => {
    if (mapRef.current && mapType === 'roadmap' && trafficLayer) {
      const newTrafficLayer = new window.google.maps.TrafficLayer();
      newTrafficLayer.setMap(mapRef.current);
      setTrafficLayer(newTrafficLayer);
    }
  }, [mapType]);

  const handleLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);  // Start loading
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(pos);
          if (mapRef.current) {
            mapRef.current.panTo(pos);
            mapRef.current.setZoom(16);
          }
          setIsLocating(false);  // Stop loading
        },
        () => {
          console.log("Error: The Geolocation service failed.");
          setIsLocating(false);  // Stop loading even if there's an error
        },
        { timeout: 10000 }  // Set a timeout of 10 seconds
      );
    } else {
      console.log("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleChargerLocations = () => {
    if (mapRef.current) {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      const request = {
        location: center,
        radius: '5000',
        type: ['electric_vehicle_charging_station']
      };

      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setChargers(results);
        }
      });
    }
  };

  const calculateRoute = () => {
    if (directionsService && searchResult) {
      directionsService.route(
        {
          origin: center,
          destination: searchResult,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            setIsNavigating(true);
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      );
    }
  };

  const endNavigation = () => {
    setIsNavigating(false);
    setSearchResult(null);
    setDirections(null);
    
    // Clear the input field
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    // Center the map on the current location
    if (mapRef.current) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(16);
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
          <img src={getImagePath("icon-wifi.svg")} alt="Wifi Status" />
        </div>
        <div className="clock">
          <Clock />
        </div>
        <div className="outsideTemp">
        <OutsideTemp />
        </div>
        <div className="airbagStatus no-select">
          <img src={getImagePath("icon-airbags.svg")} alt="Airbag Status" />
          <div className="airbagStatusText">PASSENGER AIRBAG <span className="airbagStatusOff">OFF</span></div>
        </div>
      </div>
      <div className="mapOverlayWrapper">
        {isLoaded && (
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            options={{ fields: ['place_id', 'geometry', 'name', 'formatted_address'] }}
            className="custom-autocomplete-container" // Add this line
          >
            <form className="floatingBtn navBtn" onSubmit={(e) => { e.preventDefault(); }}>
              <img className="searchIcon" src={getImagePath("icon-search.svg")} alt="Search Map" />
              <input 
                ref={inputRef}
                placeholder="Navigate" 
                name="NavigateTo"
                defaultValue={inputValue}
                onChange={handleInputChange}
              />
              {inputValue && (
                <button className="clearInput" onClick={clearInput}>
                  <img src={getImagePath("icon-x.svg")} alt="Clear input" />
                </button>
              )}
            </form>
          </Autocomplete>
        )}
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
            <img className="icon-compass" src={getImagePath("icon-compass.svg")} alt="Compass" />
          </button>
          <div className="floatingRightBtnColumn">
            <button className="floatingBtn squareBtn btnGroup" onClick={toggleMapType}>
              <img className="icon" src={getImagePath("icon-globe.svg")} alt="Map Style" />
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={toggleTraffic}>
              <img className="icon" src={getImagePath("icon-traffic.svg")} alt="Toggle Traffic" />
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={handleLocation}>
              {isLocating ? (
                <LoadingSpinner />
              ) : (
                <img className="icon" src={getImagePath("icon-map-marker.svg")} alt="Location" />
              )}
            </button>
            <button className="floatingBtn squareBtn btnGroup" onClick={handleChargerLocations}>
              <img className="icon" src={getImagePath("icon-charger-locations.svg")} alt="Charging Locations" />
            </button>
          </div>
        </div>
      </div>
      <div className="mapBackground">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={16}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              mapId: MAP_ID,
              mapTypeId: mapType,
              disableDefaultUI: true,
              gestureHandling: 'greedy',
              styles: customMapStyles,
              zoomControl: false,
              mapTypeControl: false,
              scaleControl: false,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: false
            }}
          >
            {markerIcon && (
              <Marker
                position={center}
                icon={markerIcon}
              />
            )}
            {searchResult && !isNavigating && (
              <Marker
                position={searchResult}
                icon={{
                  url: getImagePath("icon-map-marker.svg"), // Image for Map Navigation search result
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
              />
            )}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#1976D2",
                    strokeWeight: 5,
                  },
                }}
              />
            )}
            {chargers.map((charger, index) => (
              <Marker
                key={index}
                position={charger.geometry.location}
                icon={{
                  url: getImagePath("icon-charger.svg"),
                  scaledSize: new window.google.maps.Size(30, 30)
                }}
              />
            ))}
          </GoogleMap>
        ) : <></>}
      </div>
    </div>
  );
}
