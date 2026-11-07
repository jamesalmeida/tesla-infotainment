import { useState, type FormEvent } from 'react';
import {
  averageWhPerMile,
  clearEnergyHistory,
  consumptionSeries,
  energyUsedKwh,
  estimatedPowerKw,
  lastMiles,
  lastSeconds,
  latestAcceleration,
  predictedRangeMiles,
  predictTrip,
  RATED_WH_PER_MILE,
  usageBreakdown,
  useEnergyHistory,
  type EnergySample,
} from '../../../apps/energyHistory';
import { AppScreen, Callout, Tabs, ui } from '../../../apps/ui/AppScreen';
import { LineChart } from '../../../apps/ui/LineChart';
import { useCar, useCarActions } from '../../../state/CarStateContext';
import {
  createTrip,
  loadTrips,
  milesRemaining,
  saveTrips,
  startTrip,
  stopTrip,
  type PlannedTrip,
} from './trips';
import styles from './Energy.module.css';

const TABS = [
  { id: 'drive', label: 'Drive' },
  { id: 'consumption', label: 'Consumption' },
  { id: 'trip', label: 'Trip' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const WINDOWS = [5, 15, 30];
const DRIVE_WINDOW_SECONDS = 300;

const secondsAgo = (seconds: number) => {
  if (seconds > -1) return 'now';
  const total = Math.round(-seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} ago`;
};

const milesAgo = (miles: number) => (miles > -0.05 ? 'now' : `${(-miles).toFixed(1)} mi ago`);

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={styles.tile}>
      <div className={ui.muted}>{label}</div>
      <div className={styles.tileValue}>
        {value}
        {unit && <span className={styles.tileUnit}> {unit}</span>}
      </div>
    </div>
  );
}

function NoData() {
  return (
    <Callout>
      No drive recorded yet. Shift to D and hold the Up arrow key, then come back: the history keeps
      recording with this app closed.
    </Callout>
  );
}

function DriveTab({ history }: { history: EnergySample[] }) {
  const speed = useCar((state) => state.speed);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const chargeState = useCar((state) => state.chargeState);

  const recent = lastSeconds(history, DRIVE_WINDOW_SECONDS);
  const latest = recent[recent.length - 1];
  const relative = (sample: EnergySample) => (sample.t - latest.t) / 1000;
  const whPerMile = averageWhPerMile(recent) ?? RATED_WH_PER_MILE;
  const power = speed > 0 ? estimatedPowerKw(speed, latestAcceleration(recent)) : 0;

  return (
    <div className={ui.stack}>
      <div className={styles.tiles}>
        <Tile label="Speed" value={speed.toFixed(0)} unit="mph" />
        <Tile label="Power (estimate)" value={power.toFixed(0)} unit="kW" />
        <Tile
          label="Range at this rate"
          value={predictedRangeMiles(batteryPercent, whPerMile).toFixed(0)}
          unit="mi"
        />
        <Tile
          label={chargeState === 'charging' ? 'Battery, charging' : 'Battery'}
          value={batteryPercent.toFixed(0)}
          unit="%"
        />
      </div>
      {recent.length < 2 ? (
        <NoData />
      ) : (
        <div className={styles.charts}>
          <LineChart
            title="Speed, last 5 minutes"
            points={recent.map((sample) => ({ x: relative(sample), y: sample.speed }))}
            formatX={secondsAgo}
            formatY={(value) => `${value.toFixed(0)} mph`}
          />
          <LineChart
            title="Battery, last 5 minutes"
            points={recent.map((sample) => ({ x: relative(sample), y: sample.batteryPercent }))}
            formatX={secondsAgo}
            formatY={(value) => `${value.toFixed(1)}%`}
          />
        </div>
      )}
    </div>
  );
}

function ConsumptionTab({ history }: { history: EnergySample[] }) {
  const [windowMiles, setWindowMiles] = useState(WINDOWS[0]);
  const temperature = useCar((state) => state.temperature);
  const batteryPercent = useCar((state) => state.batteryPercent);

  const samples = lastMiles(history, windowMiles);
  const average = averageWhPerMile(samples);
  const series = consumptionSeries(samples);
  const shares = usageBreakdown(samples, temperature);

  return (
    <div className={ui.stack}>
      <div className={ui.inline}>
        {WINDOWS.map((miles) => (
          <button
            key={miles}
            type="button"
            aria-pressed={miles === windowMiles}
            className={`${ui.button} ${miles === windowMiles ? ui.primary : ''}`}
            onClick={() => setWindowMiles(miles)}
          >
            {miles} mi
          </button>
        ))}
        <button
          type="button"
          className={ui.button}
          disabled={history.length === 0}
          onClick={clearEnergyHistory}
        >
          Clear history
        </button>
      </div>
      {average === null ? (
        <NoData />
      ) : (
        <>
          <div className={styles.tiles}>
            <Tile label="Average" value={average.toFixed(0)} unit="Wh/mi" />
            <Tile label="Used" value={energyUsedKwh(samples).toFixed(1)} unit="kWh" />
            <Tile
              label="Predicted range"
              value={predictedRangeMiles(batteryPercent, average).toFixed(0)}
              unit="mi"
            />
          </div>
          <div className={styles.charts}>
            <LineChart
              title={`Consumption, last ${windowMiles} miles`}
              points={series}
              formatX={milesAgo}
              formatY={(value) => `${value.toFixed(0)} Wh/mi`}
            />
            <div className={ui.card}>
              <h3 className={ui.sectionTitle}>What used energy</h3>
              <ul className={styles.shares}>
                {shares.map(({ label, kwh, share }) => (
                  <li key={label} className={styles.share}>
                    <span className={styles.shareLabel}>{label}</span>
                    <span className={styles.shareTrack}>
                      <span
                        className={styles.shareBar}
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                    <span className={styles.shareValue}>
                      {kwh.toFixed(1)} kWh · {Math.round(share * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={ui.muted}>
            The total comes from the battery. The graph&apos;s shape and the split are estimated
            from speed, acceleration and cabin temperature.
          </p>
        </>
      )}
    </div>
  );
}

function TripRow({
  trip,
  whPerMile,
  onStart,
  onStop,
  onDelete,
}: {
  trip: PlannedTrip;
  whPerMile: number;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  const odometerMiles = useCar((state) => state.odometerMiles);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const remaining = milesRemaining(trip, odometerMiles);
  const { arrivalPercent, reachable } = predictTrip(batteryPercent, remaining, whPerMile);
  const isRunning = trip.startOdometer !== null;

  return (
    <li className={`${ui.row} ${styles.tripRow}`}>
      <div className={ui.rowText}>
        <div className={ui.strong}>{trip.name}</div>
        <div className={ui.muted}>
          {remaining.toFixed(1)} of {trip.miles} mi left ·{' '}
          {reachable
            ? `arrive with ${arrivalPercent.toFixed(0)}%`
            : `needs ${Math.ceil(-arrivalPercent)}% more charge`}
        </div>
      </div>
      <div className={ui.inline}>
        <button
          type="button"
          className={`${ui.button} ${isRunning ? '' : ui.primary}`}
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button
          type="button"
          className={ui.button}
          aria-label={`Delete ${trip.name}`}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function TripTab({ history }: { history: EnergySample[] }) {
  const tripMiles = useCar((state) => state.tripMiles);
  const batteryPercent = useCar((state) => state.batteryPercent);
  const odometerMiles = useCar((state) => state.odometerMiles);
  const { resetTrip } = useCarActions();

  const [trips, setTrips] = useState(loadTrips);
  const [name, setName] = useState('');
  const [miles, setMiles] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const samples = lastMiles(history, tripMiles);
  const whPerMile = averageWhPerMile(samples) ?? RATED_WH_PER_MILE;

  const update = (next: PlannedTrip[]) => {
    saveTrips(next);
    setTrips(next);
  };

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    const trip = createTrip(name, miles, `trip-${trips.length}-${Date.now()}`);
    if (!trip) {
      setFormError('Give the trip a name and a distance above zero.');
      return;
    }
    update([...trips, trip]);
    setName('');
    setMiles('');
    setFormError(null);
  };

  return (
    <div className={ui.stack}>
      <div className={styles.tiles}>
        <Tile label="Current trip" value={tripMiles.toFixed(1)} unit="mi" />
        <Tile label="Energy" value={((tripMiles * whPerMile) / 1000).toFixed(1)} unit="kWh" />
        <Tile label="Average" value={whPerMile.toFixed(0)} unit="Wh/mi" />
        <Tile
          label="Predicted range"
          value={predictedRangeMiles(batteryPercent, whPerMile).toFixed(0)}
          unit="mi"
        />
      </div>
      <div>
        <button type="button" className={ui.button} onClick={resetTrip}>
          Reset current trip
        </button>
      </div>

      <h3 className={ui.sectionTitle}>Planned trips</h3>
      <form className={ui.inline} onSubmit={handleAdd}>
        <input
          className={ui.input}
          aria-label="Trip name"
          placeholder="Trip name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className={`${ui.input} ${styles.milesInput}`}
          aria-label="Distance in miles"
          placeholder="Miles"
          inputMode="decimal"
          value={miles}
          onChange={(event) => setMiles(event.target.value)}
        />
        <button type="submit" className={ui.button}>
          Add trip
        </button>
      </form>
      {formError && <Callout tone="warning">{formError}</Callout>}
      {trips.length === 0 ? (
        <div className={ui.muted}>No trips yet. Add one to see its predicted arrival charge.</div>
      ) : (
        <ul className={ui.list}>
          {trips.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              whPerMile={whPerMile}
              onStart={() => update(startTrip(trips, trip.id, odometerMiles))}
              onStop={() => update(stopTrip(trips, trip.id))}
              onDelete={() => update(trips.filter((item) => item.id !== trip.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export const Energy = () => {
  const [tab, setTab] = useState<Tab>('drive');
  const history = useEnergyHistory();

  return (
    <AppScreen
      title="Energy"
      toolbar={<Tabs tabs={TABS} value={tab} onChange={setTab} label="Energy views" />}
    >
      {tab === 'drive' && <DriveTab history={history} />}
      {tab === 'consumption' && <ConsumptionTab history={history} />}
      {tab === 'trip' && <TripTab history={history} />}
    </AppScreen>
  );
};
