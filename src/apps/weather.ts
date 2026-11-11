// Live weather comes from Open-Meteo, which needs no API key. Every shape here is checked
// before it reaches the screen, and a sample reading stands in when the network or the
// browser's location is unavailable.

export interface WeatherReading {
  temperatureF: number;
  highF: number;
  lowF: number;
  weatherCode: number;
  aqi: number | null;
  source: 'live' | 'sample';
  fetchedAt: number;
}

// A made-up but plausible day, so the display always has something to show.
export const SAMPLE_WEATHER: WeatherReading = {
  temperatureF: 72,
  highF: 78,
  lowF: 64,
  weatherCode: 1,
  aqi: 42,
  source: 'sample',
  fetchedAt: 0,
};

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Heavy showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

export const weatherLabel = (code: number): string => WEATHER_LABELS[code] ?? 'Mixed conditions';

export function aqiLabel(aqi: number): { label: string; level: 'good' | 'moderate' | 'poor' } {
  if (aqi <= 50) return { label: 'Good', level: 'good' };
  if (aqi <= 100) return { label: 'Moderate', level: 'moderate' };
  return { label: 'Unhealthy', level: 'poor' };
}

export function weatherUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function airQualityUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'us_aqi',
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function parseWeather(payload: unknown, airPayload: unknown): WeatherReading | null {
  if (!record(payload) || !record(payload.current) || !record(payload.daily)) return null;
  const { temperature_2m: temperatureF, weather_code: weatherCode } = payload.current;
  const high = payload.daily.temperature_2m_max;
  const low = payload.daily.temperature_2m_min;
  if (!isNumber(temperatureF) || !isNumber(weatherCode)) return null;
  if (!Array.isArray(high) || !Array.isArray(low)) return null;
  if (!isNumber(high[0]) || !isNumber(low[0])) return null;

  let aqi: number | null = null;
  if (record(airPayload) && record(airPayload.current) && isNumber(airPayload.current.us_aqi)) {
    aqi = airPayload.current.us_aqi;
  }

  return {
    temperatureF,
    highF: high[0],
    lowF: low[0],
    weatherCode,
    aqi,
    source: 'live',
    fetchedAt: Date.now(),
  };
}
