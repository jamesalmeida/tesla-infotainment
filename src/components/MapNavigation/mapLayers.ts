export type MapStyle = 'roadmap' | 'satellite';
export type ChargerStatus = 'off' | 'loading' | 'on' | 'error';
export type LocationStatus = 'idle' | 'locating' | 'error';
export type Charger = Pick<google.maps.places.Place, 'id' | 'location'>;

export const DEFAULT_CAR_POSITION: google.maps.LatLngLiteral = {
  lat: 33.9210278,
  lng: -118.33005555555555,
};

export interface MapLayersState {
  mapStyle: MapStyle;
  traffic: boolean;
  chargers: ChargerStatus;
  chargerResults: Charger[];
  chargerRequestId: number;
  location: LocationStatus;
  locationError: string | null;
  locationRequestId: number;
  /** Where the car is. The area on screen belongs to the map, which can pan away from it. */
  carPosition: google.maps.LatLngLiteral;
}

export type MapLayersAction =
  | { type: 'mapStyleToggled' }
  | { type: 'trafficToggled' }
  | { type: 'chargersToggled' }
  | { type: 'chargersLoaded'; requestId: number; chargers: Charger[] }
  | { type: 'chargersFailed'; requestId: number }
  | { type: 'locatePressed'; supported: boolean }
  | { type: 'located'; requestId: number; position: google.maps.LatLngLiteral }
  | { type: 'locateFailed'; requestId: number; code: number }
  | { type: 'locationErrorDismissed' };

export const initialMapLayers: MapLayersState = {
  mapStyle: 'roadmap',
  traffic: false,
  chargers: 'off',
  chargerResults: [],
  chargerRequestId: 0,
  location: 'idle',
  locationError: null,
  locationRequestId: 0,
  carPosition: DEFAULT_CAR_POSITION,
};

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_TIMEOUT = 3;

function geolocationMessage(code: number) {
  switch (code) {
    case GEOLOCATION_PERMISSION_DENIED:
      return 'Location access is blocked. Allow it in your browser settings to use Locate.';
    case GEOLOCATION_TIMEOUT:
      return 'Finding your location took too long.';
    default:
      return "Your location isn't available right now.";
  }
}

export function mapLayersReducer(state: MapLayersState, action: MapLayersAction): MapLayersState {
  switch (action.type) {
    // Google draws traffic on the road map only, so satellite and traffic exclude each other.
    case 'mapStyleToggled':
      return state.mapStyle === 'roadmap'
        ? { ...state, mapStyle: 'satellite', traffic: false }
        : { ...state, mapStyle: 'roadmap' };

    case 'trafficToggled':
      return state.traffic
        ? { ...state, traffic: false }
        : { ...state, traffic: true, mapStyle: 'roadmap' };

    case 'chargersToggled':
      return {
        ...state,
        chargers: state.chargers === 'off' ? 'loading' : 'off',
        chargerResults: [],
        chargerRequestId: state.chargerRequestId + 1,
      };

    case 'chargersLoaded':
      if (state.chargers !== 'loading' || action.requestId !== state.chargerRequestId) return state;
      return { ...state, chargers: 'on', chargerResults: action.chargers };

    case 'chargersFailed':
      if (state.chargers !== 'loading' || action.requestId !== state.chargerRequestId) return state;
      return { ...state, chargers: 'error' };

    case 'locatePressed':
      if (state.location === 'locating') {
        // A second tap cancels. The answer can't be recalled, so it's ignored when it comes.
        return { ...state, location: 'idle', locationRequestId: state.locationRequestId + 1 };
      }
      if (!action.supported) {
        return {
          ...state,
          location: 'error',
          locationError: "This browser can't share its location.",
        };
      }
      return {
        ...state,
        location: 'locating',
        locationError: null,
        locationRequestId: state.locationRequestId + 1,
      };

    case 'located':
      if (state.location !== 'locating' || action.requestId !== state.locationRequestId) {
        return state;
      }
      return { ...state, location: 'idle', carPosition: action.position };

    case 'locateFailed':
      if (state.location !== 'locating' || action.requestId !== state.locationRequestId) {
        return state;
      }
      return { ...state, location: 'error', locationError: geolocationMessage(action.code) };

    case 'locationErrorDismissed':
      if (state.location !== 'error') return state;
      return { ...state, location: 'idle', locationError: null };
  }
}
