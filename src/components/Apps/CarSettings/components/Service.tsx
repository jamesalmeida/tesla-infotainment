import { useState } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  hasTirePressureWarning,
  TIRE_CORNERS,
  TIRE_CORNER_LABELS,
} from '../../../../state/carState';
import {
  MANUAL_TOPICS,
  RECOMMENDED_TIRE_PSI,
  SERVICE_INTERVALS,
  VEHICLE_INFO,
  WHEEL_OPTIONS,
} from '../../../../state/sampleData';
import { formatDistanceFixed, formatTirePressure } from '../../../../utils/units';
import {
  Button,
  Choice,
  DemoNote,
  Page,
  Row,
  Section,
  Stat,
  Stats,
  Toggle,
  panelStyles,
} from './SystemPanel';

const milesUntil = (odometer: number, everyMiles: number) => everyMiles - (odometer % everyMiles);

function VehicleInfo() {
  const name = useCar((state) => state.settings.vehicleName);
  const odometer = useCar((state) => state.odometerMiles);
  const units = useCar((state) => state.settings.preferences.distance);

  return (
    <Section title="Vehicle">
      <Stats>
        <Stat label="Name" value={name} />
        <Stat label="Model" value={VEHICLE_INFO.model} />
        <Stat label="VIN" value={VEHICLE_INFO.vin} />
        <Stat label="Battery" value={VEHICLE_INFO.battery} />
        <Stat label="Odometer" value={formatDistanceFixed(odometer, units, 0)} />
      </Stats>
    </Section>
  );
}

function Tires() {
  const wheelConfig = useCar((state) => state.settings.wheelConfig);
  const pressures = useCar((state) => state.tirePressures);
  const unit = useCar((state) => state.settings.preferences.tirePressure);
  const warning = useCar(hasTirePressureWarning);
  const { setSettings } = useCarActions();

  return (
    <Section title="Tire Service">
      <Stats>
        {TIRE_CORNERS.map((corner) => (
          <Stat
            key={corner}
            label={TIRE_CORNER_LABELS[corner]}
            value={formatTirePressure(pressures[corner], unit)}
          />
        ))}
      </Stats>
      {warning && (
        <p className={panelStyles.hint} role="status">
          Low tire pressure. Recommended cold pressure is{' '}
          {formatTirePressure(RECOMMENDED_TIRE_PSI, unit)}.
        </p>
      )}
      <Choice
        label="Wheel Configuration"
        value={wheelConfig}
        options={WHEEL_OPTIONS}
        onChange={(value) => setSettings({ wheelConfig: value })}
      />
    </Section>
  );
}

function Upcoming() {
  const odometer = useCar((state) => Math.floor(state.odometerMiles));
  const units = useCar((state) => state.settings.preferences.distance);
  const booked = useCar((state) => state.settings.serviceVisitBooked);
  const { setSettings } = useCarActions();

  return (
    <Section title="Scheduled Service">
      <ul className={panelStyles.list}>
        {SERVICE_INTERVALS.map(({ item, everyMiles }) => (
          <li key={item} className={panelStyles.listItem}>
            <Row
              label={item}
              hint={`Due in ${formatDistanceFixed(milesUntil(odometer, everyMiles), units, 0)}`}
            />
          </li>
        ))}
      </ul>
      <Toggle
        label="Demo Service Visit"
        hint={booked ? 'Booked. Nobody will come.' : 'Pretend to book a visit.'}
        checked={booked}
        onChange={(serviceVisitBooked) => setSettings({ serviceVisitBooked })}
      />
    </Section>
  );
}

function OwnersManual() {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  return (
    <Section title="Owner's Manual" hint="A short guide to this simulator, not to a real car.">
      <ul className={panelStyles.list}>
        {MANUAL_TOPICS.map(({ title, body }) => (
          <li key={title} className={panelStyles.listItem}>
            <Row label={title}>
              <Button
                label={`${openTopic === title ? 'Hide' : 'Read'} ${title}`}
                onPress={() => setOpenTopic(openTopic === title ? null : title)}
              >
                {openTopic === title ? 'Hide' : 'Read'}
              </Button>
            </Row>
            {openTopic === title && <p className={panelStyles.hint}>{body}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Maintenance() {
  const towMode = useCar((state) => state.settings.towMode);
  const { restartDisplay, setTowMode } = useCarActions();

  return (
    <Section title="Maintenance">
      <Toggle
        label="Tow Mode"
        hint="For moving the car on a flatbed. Blocks Drive and Reverse. Park only."
        checked={towMode}
        onChange={setTowMode}
      />
      <Row label="Touchscreen" hint="Replays the boot animation. Park only.">
        <Button onPress={restartDisplay}>Restart</Button>
      </Row>
    </Section>
  );
}

export const Service = () => {
  return (
    <Page title="Service">
      <DemoNote>Demo only: the vehicle details and service dates are sample data.</DemoNote>
      <div className={panelStyles.twoColumns}>
        <VehicleInfo />
        <Maintenance />
      </div>
      <div className={panelStyles.twoColumns}>
        <Tires />
        <Upcoming />
      </div>
      <OwnersManual />
    </Page>
  );
};
