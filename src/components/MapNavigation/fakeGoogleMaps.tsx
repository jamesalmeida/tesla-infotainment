import type { ReactNode } from 'react';
import { vi } from 'vitest';

/*
 * A fake of the parts of `google.maps` this feature uses, so tests never reach Google
 * (Maps calls are billed). Every async call parks in a queue until the test settles it,
 * which lets a test choose the order responses arrive in.
 *
 *   vi.mock('@vis.gl/react-google-maps', async () => (await import('./fakeGoogleMaps')).visGlMock);
 *   const fake = installFakeMaps();
 */

interface PendingCall<Request, Response> {
  request: Request;
  resolve: (response: Response) => void;
  reject: (error?: unknown) => void;
}

function callQueue<Request, Response>() {
  const calls: PendingCall<Request, Response>[] = [];
  const call = (request: Request) =>
    new Promise<Response>((resolve, reject) => {
      calls.push({ request, resolve, reject });
    });
  return { calls, call };
}

type LatLng = google.maps.LatLngLiteral;

interface FakeSuggestionOptions {
  location?: LatLng | null;
  displayName?: string;
}

export type FakeSuggestion = google.maps.places.AutocompleteSuggestion;

let nextPlaceId = 1;

export function createFakeMaps() {
  const autocomplete = callQueue<
    google.maps.places.AutocompleteRequest,
    { suggestions: FakeSuggestion[] }
  >();
  const details = callQueue<google.maps.places.FetchFieldsRequest, unknown>();
  const nearby = callQueue<
    google.maps.places.SearchNearbyRequest,
    { places: google.maps.places.Place[] }
  >();
  const routes = callQueue<
    google.maps.routes.ComputeRoutesRequest,
    { routes: google.maps.routes.Route[] | undefined }
  >();

  const trafficLayers: { setMap: ReturnType<typeof vi.fn> }[] = [];
  class TrafficLayer {
    setMap = vi.fn();
    constructor() {
      trafficLayers.push(this);
    }
  }

  const sessionTokens: object[] = [];
  class AutocompleteSessionToken {
    constructor() {
      sessionTokens.push(this);
    }
  }

  let viewportCenter: LatLng = { lat: 10, lng: 20 };
  let heading = 0;
  const mapListeners = new globalThis.Map<string, Set<() => void>>();

  const map = {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    moveCamera: vi.fn((camera: google.maps.CameraOptions) => {
      if (camera.heading === undefined || camera.heading === heading) return;
      heading = camera.heading;
      mapListeners.get('heading_changed')?.forEach((listener) => listener());
    }),
    fitBounds: vi.fn(),
    getCenter: vi.fn(() => ({ toJSON: () => viewportCenter })),
    getHeading: vi.fn(() => heading),
    getRenderingType: vi.fn(() => 'VECTOR'),
    addListener: vi.fn((event: string, listener: () => void) => {
      const listeners = mapListeners.get(event) ?? new Set();
      mapListeners.set(event, listeners.add(listener));
      return { remove: () => listeners.delete(listener) };
    }),
  };

  const places = {
    AutocompleteSessionToken,
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: autocomplete.call },
    Place: { searchNearby: nearby.call },
  };

  return {
    map: map as typeof map & google.maps.Map,
    libraries: {
      places: places as unknown as google.maps.PlacesLibrary | null,
      routes: {
        Route: { computeRoutes: routes.call },
      } as unknown as google.maps.RoutesLibrary | null,
      maps: { TrafficLayer } as unknown as google.maps.MapsLibrary | null,
    },
    /** Pending `fetchAutocompleteSuggestions` calls, oldest first. */
    autocompleteCalls: autocomplete.calls,
    /** Pending `place.fetchFields` calls, oldest first. */
    detailCalls: details.calls,
    /** Pending `Place.searchNearby` calls, oldest first. */
    nearbyCalls: nearby.calls,
    /** Pending `Route.computeRoutes` calls, oldest first. */
    routeCalls: routes.calls,
    trafficLayers,
    sessionTokens,
    /** What the last render passed to APIProvider, or null if it never rendered. */
    apiProvider: null as { apiKey: string; onError?: (error: unknown) => void } | null,
    /** What the last render passed to Map. */
    mapProps: null as MockMapProps | null,
    /** How many times Map has rendered, to prove what doesn't re-render it. */
    mapRenders: 0,
    setViewportCenter(center: LatLng) {
      viewportCenter = center;
    },
    /** Builds a suggestion. Its place resolves to `location` once `detailCalls` settles. */
    suggestion(text: string, options: FakeSuggestionOptions = {}): FakeSuggestion {
      const { location = { lat: 1, lng: 2 }, displayName = text } = options;
      const placeId = `place-${nextPlaceId++}`;
      return {
        placePrediction: {
          placeId,
          text: { text },
          mainText: { text },
          secondaryText: null,
          toPlace() {
            const place = {
              displayName: null as string | null,
              formattedAddress: null as string | null,
              location: null as { toJSON: () => LatLng } | null,
              fetchFields: async (request: google.maps.places.FetchFieldsRequest) => {
                await details.call(request);
                place.displayName = displayName;
                place.location = location && { toJSON: () => location };
                return { place };
              },
            };
            return place;
          },
        },
      } as unknown as FakeSuggestion;
    },
    /** Builds a computeRoutes response whose path runs through `points`. */
    route(points: LatLng[], viewport: unknown = { fake: 'bounds' }) {
      return { routes: [{ path: points, viewport }] } as unknown as {
        routes: google.maps.routes.Route[];
      };
    },
    /** Builds a charger as returned by `Place.searchNearby`. */
    charger(id: string, location: LatLng) {
      return { id, location } as unknown as google.maps.places.Place;
    },
  };
}

export type FakeMaps = ReturnType<typeof createFakeMaps>;

let current: FakeMaps | null = null;

function installed(): FakeMaps {
  if (!current) throw new Error('Call installFakeMaps() before rendering');
  return current;
}

/** Creates a fresh fake and points the mocked library at it. */
export function installFakeMaps(): FakeMaps {
  current = createFakeMaps();
  return current;
}

interface MockAPIProviderProps {
  apiKey: string;
  onError?: (error: unknown) => void;
  children?: ReactNode;
}

interface MockMapProps {
  mapTypeId?: string;
  renderingType?: string;
  onDragstart?: () => void;
  children?: ReactNode;
}

/** Stands in for `@vis.gl/react-google-maps`. None of it loads a script or calls Google. */
export const visGlMock = {
  APIProvider({ apiKey, onError, children }: MockAPIProviderProps) {
    installed().apiProvider = { apiKey, onError };
    return <>{children}</>;
  },
  RenderingType: { VECTOR: 'VECTOR', RASTER: 'RASTER' },
  Map(props: MockMapProps) {
    installed().mapProps = props;
    installed().mapRenders++;
    return (
      <div data-testid="map" data-map-type={props.mapTypeId}>
        {props.children}
      </div>
    );
  },
  AdvancedMarker({
    position,
    onClick,
    children,
  }: {
    position?: LatLng | null;
    onClick?: () => void;
    children?: ReactNode;
  }) {
    return (
      <div data-testid="marker" data-position={JSON.stringify(position)} onClick={onClick}>
        {children}
      </div>
    );
  },
  Pin: () => <span data-testid="charger-pin" />,
  Polyline({ path }: { path?: LatLng[] }) {
    return <div data-testid="route-line" data-path={JSON.stringify(path)} />;
  },
  useMap: () => installed().map,
  useMapsLibrary: (name: 'places' | 'routes' | 'maps') => installed().libraries[name],
};
