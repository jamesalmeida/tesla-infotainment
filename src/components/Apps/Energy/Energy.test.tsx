import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import {
  addSample,
  averageWhPerMile,
  clearEnergyHistory,
  consumptionSeries,
  estimatedPowerKw,
  lastMiles,
  MAX_SAMPLES,
  parseHistory,
  predictedRangeMiles,
  predictTrip,
  RATED_WH_PER_MILE,
  recordEnergySample,
  reloadEnergyHistory,
  shouldSample,
  usageBreakdown,
  type EnergySample,
} from '../../../apps/energyHistory';
import { Energy } from './Energy';
import { createTrip, loadTrips, milesRemaining, saveTrips, startTrip } from './trips';

const PERCENT_PER_MILE = 100 / 310;

// A steady drive, draining exactly as the simulator does.
const drive = (count: number, speed = 60): EnergySample[] =>
  Array.from({ length: count }, (_, index) => {
    const miles = (index * speed) / 3600;
    return {
      t: 1000000 + index * 1000,
      odometerMiles: 100 + miles,
      batteryPercent: 80 - miles * PERCENT_PER_MILE,
      speed,
      charging: false,
    };
  });

const renderEnergy = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Energy />
    </CarStateProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  reloadEnergyHistory();
});

describe('energy history', () => {
  test('samples only when something changes and at most once a second', () => {
    const [first, second] = drive(2);
    const parked = { ...first, speed: 0 };

    expect(shouldSample(undefined, parked)).toBe(false);
    expect(shouldSample(undefined, first)).toBe(true);
    expect(shouldSample(first, { ...second, t: first.t + 200 })).toBe(false);
    expect(shouldSample(first, second)).toBe(true);
    // The stop itself still gets recorded, then nothing until it moves again.
    expect(shouldSample(first, { ...second, speed: 0 })).toBe(true);
    expect(shouldSample(parked, { ...parked, t: parked.t + 5000 })).toBe(false);
  });

  test('the history is capped', () => {
    const sample = drive(1)[0];
    const full = Array.from({ length: MAX_SAMPLES }, () => sample);
    expect(addSample(full, { ...sample, t: 5 })).toHaveLength(MAX_SAMPLES);
  });

  test('average consumption matches what the simulator drains', () => {
    expect(averageWhPerMile(drive(120))).toBeCloseTo(RATED_WH_PER_MILE, 3);
  });

  test('there is no average without distance, and charging is not consumption', () => {
    expect(averageWhPerMile(drive(1))).toBeNull();
    const [from, to] = drive(2);
    expect(averageWhPerMile([{ ...from, charging: true }, to])).toBeNull();
  });

  test('a window keeps only the last miles', () => {
    const samples = drive(121);
    const window = lastMiles(samples, 1);
    expect(window[window.length - 1].odometerMiles - window[0].odometerMiles).toBeLessThanOrEqual(
      1,
    );
    expect(window.length).toBeLessThan(samples.length);
  });

  test('the graph is shaped by speed but averages to the measured figure', () => {
    const slow = drive(120, 30);
    const fast = drive(120, 80).map((sample) => ({
      ...sample,
      t: sample.t + 200000,
      odometerMiles: sample.odometerMiles + 1,
      batteryPercent: sample.batteryPercent - PERCENT_PER_MILE,
    }));
    const series = consumptionSeries([...slow, ...fast], 4);

    expect(series[series.length - 1].y).toBeGreaterThan(series[0].y);
    expect(series[series.length - 1].x).toBeLessThan(0);
  });

  test('the breakdown adds up to everything used, with climate rising in extremes', () => {
    const samples = drive(120);
    const total = (temperature: number) =>
      usageBreakdown(samples, temperature).reduce((sum, item) => sum + item.share, 0);
    const climate = (temperature: number) =>
      usageBreakdown(samples, temperature).find((item) => item.label === 'Climate')?.share ?? 0;

    expect(total(70)).toBeCloseTo(1);
    expect(climate(85)).toBeGreaterThan(climate(70));
    expect(usageBreakdown([], 70)).toEqual([]);
  });

  test('power is negative under regenerative braking', () => {
    expect(estimatedPowerKw(60, 0)).toBeGreaterThan(0);
    expect(estimatedPowerKw(60, -18)).toBeLessThan(estimatedPowerKw(60, 0));
  });

  test('predictions follow the battery', () => {
    expect(predictedRangeMiles(100, RATED_WH_PER_MILE)).toBeCloseTo(310);
    expect(predictTrip(50, 100, RATED_WH_PER_MILE).arrivalPercent).toBeCloseTo(50 - 100 / 3.1);
    expect(predictTrip(10, 100, RATED_WH_PER_MILE).reachable).toBe(false);
  });

  test('corrupt storage comes back empty and bad rows are dropped', () => {
    expect(parseHistory('{oops')).toEqual([]);
    expect(parseHistory(JSON.stringify([{ t: 'x' }, drive(1)[0]]))).toHaveLength(1);
  });
});

describe('trips', () => {
  test('a trip needs a name and a real distance', () => {
    expect(createTrip(' ', '10', 'a')).toBeNull();
    expect(createTrip('Home', 'far', 'a')).toBeNull();
    expect(createTrip('Home', '0', 'a')).toBeNull();
    expect(createTrip(' Home ', '12.5', 'a')).toMatchObject({ name: 'Home', miles: 12.5 });
  });

  test('progress comes from the odometer and only one trip runs at once', () => {
    const a = { id: 'a', name: 'A', miles: 10, startOdometer: null };
    const b = { id: 'b', name: 'B', miles: 20, startOdometer: 5 };
    const started = startTrip([a, b], 'a', 100);

    expect(started[1].startOdometer).toBeNull();
    expect(milesRemaining(started[0], 104)).toBe(6);
    expect(milesRemaining(started[0], 200)).toBe(0);
    expect(milesRemaining(a, 500)).toBe(10);
  });

  test('trips outlive the app', () => {
    saveTrips([{ id: 'a', name: 'A', miles: 10, startOdometer: null }]);
    expect(loadTrips()).toHaveLength(1);
  });
});

describe('screen', () => {
  test('starts with an explanation and fills in from recorded samples', () => {
    renderEnergy();
    expect(screen.getByRole('heading', { name: 'Energy' })).toBeInTheDocument();
    expect(screen.getByText(/No drive recorded yet/)).toBeInTheDocument();
    clearEnergyHistory();
  });

  test('the consumption tab shows the average and what used energy', () => {
    drive(200).forEach(recordEnergySample);
    renderEnergy();

    fireEvent.click(screen.getByRole('tab', { name: 'Consumption' }));

    expect(screen.getByText('What used energy')).toBeInTheDocument();
    expect(screen.getByText('242')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Consumption, last 5 miles/ })).toBeInTheDocument();
  });

  test('a trip can be added, predicted and deleted', () => {
    renderEnergy();
    fireEvent.click(screen.getByRole('tab', { name: 'Trip' }));

    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Coast' } });
    fireEvent.change(screen.getByLabelText('Distance in miles'), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add trip' }));

    expect(screen.getByText(/arrive with 59%/)).toBeInTheDocument();
    expect(loadTrips()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Coast' }));
    expect(loadTrips()).toHaveLength(0);
  });

  test('an unusable trip form says why', () => {
    renderEnergy();
    fireEvent.click(screen.getByRole('tab', { name: 'Trip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add trip' }));
    expect(screen.getByText(/Give the trip a name/)).toBeInTheDocument();
  });
});
