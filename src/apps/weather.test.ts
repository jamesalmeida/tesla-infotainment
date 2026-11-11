import { airQualityUrl, aqiLabel, parseWeather, weatherLabel, weatherUrl } from './weather';

const forecast = {
  current: { temperature_2m: 71.6, weather_code: 2 },
  daily: { temperature_2m_max: [79.2], temperature_2m_min: [63.1] },
};

const air = { current: { us_aqi: 37 } };

test('parses a live forecast and air quality reading', () => {
  const reading = parseWeather(forecast, air);
  expect(reading).toMatchObject({
    temperatureF: 71.6,
    highF: 79.2,
    lowF: 63.1,
    weatherCode: 2,
    aqi: 37,
    source: 'live',
  });
});

test('an air quality failure leaves the forecast alone', () => {
  expect(parseWeather(forecast, null)).toMatchObject({ aqi: null, source: 'live' });
});

test.each([
  [null, 'no response'],
  [{ current: { temperature_2m: 'warm' }, daily: {} }, 'a bad temperature'],
  [{ current: { temperature_2m: 70, weather_code: 1 }, daily: {} }, 'no daily range'],
])('%s (%s) is rejected', (payload, _name) => {
  expect(parseWeather(payload, air)).toBeNull();
});

test('weather codes have readable labels', () => {
  expect(weatherLabel(0)).toBe('Clear');
  expect(weatherLabel(2)).toBe('Partly cloudy');
  expect(weatherLabel(1234)).toBe('Mixed conditions');
});

test('air quality is grouped into three levels', () => {
  expect(aqiLabel(20)).toEqual({ label: 'Good', level: 'good' });
  expect(aqiLabel(80)).toEqual({ label: 'Moderate', level: 'moderate' });
  expect(aqiLabel(150)).toEqual({ label: 'Unhealthy', level: 'poor' });
});

test('the requests ask for the right endpoints and fields', () => {
  const weather = new URL(weatherUrl(37.7749, -122.4194));
  expect(weather.origin + weather.pathname).toBe('https://api.open-meteo.com/v1/forecast');
  expect(weather.searchParams.get('current')).toBe('temperature_2m,weather_code');
  expect(weather.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min');
  expect(weather.searchParams.get('temperature_unit')).toBe('fahrenheit');
  expect(weather.searchParams.get('latitude')).toBe('37.7749');

  const airQuality = new URL(airQualityUrl(37.7749, -122.4194));
  expect(airQuality.origin + airQuality.pathname).toBe(
    'https://air-quality-api.open-meteo.com/v1/air-quality',
  );
  expect(airQuality.searchParams.get('current')).toBe('us_aqi');
});
