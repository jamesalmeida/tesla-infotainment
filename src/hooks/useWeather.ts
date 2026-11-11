import { useCallback, useEffect, useRef, useState } from 'react';
import {
  airQualityUrl,
  parseWeather,
  SAMPLE_WEATHER,
  weatherUrl,
  type WeatherReading,
} from '../apps/weather';

export type WeatherStatus = 'locating' | 'live' | 'sample' | 'offline';

const LOCATION_TIMEOUT_MS = 8000;
const REFRESH_MS = 15 * 60 * 1000;

const withTimeout = <T>(promise: Promise<T>, milliseconds: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const readPosition = (): Promise<GeolocationPosition> =>
  withTimeout(
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: REFRESH_MS,
      });
    }),
    LOCATION_TIMEOUT_MS,
  );

const fetchJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Weather request failed with ${response.status}`);
  return response.json();
};

// Live when the browser can tell us where it is, a clearly-labelled sample otherwise.
// The hook never leaves the display blank while it waits.
export function useWeather() {
  const [reading, setReading] = useState<WeatherReading>(SAMPLE_WEATHER);
  const [status, setStatus] = useState<WeatherStatus>('sample');
  const [reload, setReload] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('sample');
      setReading(SAMPLE_WEATHER);
      return () => controller.abort();
    }

    setStatus('locating');

    const load = async () => {
      try {
        const position = await readPosition();
        const { latitude, longitude } = position.coords;
        const [weather, air] = await Promise.all([
          fetchJson(weatherUrl(latitude, longitude), controller.signal),
          fetchJson(airQualityUrl(latitude, longitude), controller.signal).catch(() => null),
        ]);
        const parsed = parseWeather(weather, air);
        if (!parsed) throw new Error('Unexpected weather response');
        setReading(parsed);
        setStatus('live');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Weather is unavailable', error);
        setReading(SAMPLE_WEATHER);
        setStatus('offline');
      }
    };

    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [reload]);

  const refresh = useCallback(() => setReload((count) => count + 1), []);

  return { reading, status, refresh };
}
