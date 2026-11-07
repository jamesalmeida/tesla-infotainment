import { useState } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  MAX_NAME_LENGTH,
  MAX_TRIP_METERS,
  rangeMiles,
  vehiclePower,
  type MapUnits,
  type TripMeter,
  type VehiclePower,
} from '../../../../state/carState';
import { formatDistance, toDisplayDistance, unitLabel } from '../../../../utils/units';
import {
  Button,
  ButtonRow,
  NameForm,
  Page,
  Row,
  Section,
  Stat,
  Stats,
  panelStyles,
} from './SystemPanel';

const POWER_LABELS: Record<VehiclePower, string> = {
  parked: 'Parked',
  driving: 'Driving',
  charging: 'Charging',
};

const formatEfficiency = (miles: number, kwh: number, units: MapUnits) => {
  const distance = toDisplayDistance(miles, units);
  if (distance < 0.05) return '--';
  return `${Math.round((kwh * 1000) / distance)} Wh/${unitLabel(units)}`;
};

function MeterStats({ miles, kwh }: { miles: number; kwh: number }) {
  const units = useCar((state) => state.settings.mapUnits);

  return (
    <Stats>
      <Stat label="Distance" value={formatDistance(miles, units)} />
      <Stat label="Energy" value={`${kwh.toFixed(1)} kWh`} />
      <Stat label="Average" value={formatEfficiency(miles, kwh, units)} />
    </Stats>
  );
}

function LiveStatus() {
  const speed = useCar((state) => state.speed);
  const battery = useCar((state) => state.batteryPercent);
  const odometer = useCar((state) => state.odometerMiles);
  const range = useCar(rangeMiles);
  const power = useCar(vehiclePower);
  const units = useCar((state) => state.settings.mapUnits);

  return (
    <Section>
      <Stats>
        <Stat label="Status" value={POWER_LABELS[power]} />
        <Stat
          label="Speed"
          value={`${Math.round(toDisplayDistance(speed, units))} ${units === 'km' ? 'km/h' : 'mph'}`}
        />
        <Stat label="Battery" value={`${Math.round(battery)}%`} />
        <Stat label="Range" value={formatDistance(range, units, 0)} />
        <Stat label="Odometer" value={formatDistance(odometer, units, 0)} />
      </Stats>
    </Section>
  );
}

function CurrentTrip() {
  const miles = useCar((state) => state.tripMiles);
  const kwh = useCar((state) => state.energyUsedKwh - state.tripStartKwh);
  const { resetTrip } = useCarActions();

  return (
    <Section title="Current Trip">
      <MeterStats miles={miles} kwh={kwh} />
      <ButtonRow>
        <Button label="Reset Current Trip" onPress={resetTrip}>
          Reset
        </Button>
      </ButtonRow>
    </Section>
  );
}

function SinceLastCharge() {
  const miles = useCar((state) => state.odometerMiles - state.sinceChargeBaseline.miles);
  const kwh = useCar((state) => state.energyUsedKwh - state.sinceChargeBaseline.kwh);

  return (
    <Section title="Since Last Charge" hint="Restarts by itself the next time the car charges.">
      <MeterStats miles={miles} kwh={kwh} />
    </Section>
  );
}

function Meter({
  meter,
  isFirst,
  isLast,
}: {
  meter: TripMeter;
  isFirst: boolean;
  isLast: boolean;
}) {
  const miles = useCar((state) => state.odometerMiles - meter.miles);
  const kwh = useCar((state) => state.energyUsedKwh - meter.kwh);
  const { moveTripMeter, removeTripMeter, renameTripMeter, resetTripMeter } = useCarActions();
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <li className={panelStyles.listItem}>
      {isRenaming ? (
        <NameForm
          label={`New name for ${meter.name}`}
          submitLabel="Save"
          initialValue={meter.name}
          maxLength={MAX_NAME_LENGTH}
          onSubmit={(name) => {
            renameTripMeter(meter.id, name);
            setIsRenaming(false);
          }}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <Row label={meter.name} />
      )}
      <MeterStats miles={miles} kwh={kwh} />
      <ButtonRow>
        <Button label={`Reset ${meter.name}`} onPress={() => resetTripMeter(meter.id)}>
          Reset
        </Button>
        <Button label={`Rename ${meter.name}`} onPress={() => setIsRenaming(true)}>
          Rename
        </Button>
        <Button
          label={`Move ${meter.name} up`}
          disabled={isFirst}
          onPress={() => moveTripMeter(meter.id, -1)}
        >
          ↑
        </Button>
        <Button
          label={`Move ${meter.name} down`}
          disabled={isLast}
          onPress={() => moveTripMeter(meter.id, 1)}
        >
          ↓
        </Button>
        <Button
          variant="danger"
          label={`Delete ${meter.name}`}
          onPress={() => removeTripMeter(meter.id)}
        >
          Delete
        </Button>
      </ButtonRow>
    </li>
  );
}

function NamedMeters() {
  const meters = useCar((state) => state.tripMeters);
  const { addTripMeter } = useCarActions();

  return (
    <Section title="Trip Meters" hint="Name a meter for a journey you want to keep an eye on.">
      {meters.length > 0 && (
        <ul className={panelStyles.list}>
          {meters.map((meter, index) => (
            <Meter
              key={meter.id}
              meter={meter}
              isFirst={index === 0}
              isLast={index === meters.length - 1}
            />
          ))}
        </ul>
      )}
      {meters.length < MAX_TRIP_METERS && (
        <NameForm
          label="New trip meter"
          submitLabel="Add"
          maxLength={MAX_NAME_LENGTH}
          onSubmit={addTripMeter}
        />
      )}
    </Section>
  );
}

export const Trips = () => (
  <Page title="Trips">
    <LiveStatus />
    <div className={panelStyles.twoColumns}>
      <CurrentTrip />
      <SinceLastCharge />
    </div>
    <NamedMeters />
  </Page>
);
