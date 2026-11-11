import type { ReactNode } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type {
  Airflow,
  ClimateMode,
  DefrostWindow,
  OverheatProtection,
  SeatId,
  TemperatureZone,
} from '../../state/carState';
import {
  CLIMATE_MODE_LABELS,
  CLIMATE_MODES,
  COOLED_SEATS,
  isFrontDefrostOn,
  isHeatAuto,
  MAX_FAN_SPEED,
  MIN_FAN_SPEED,
  seatHeatLabel,
} from '../../state/climate';
import { Glyph } from './Glyph';
import { SeatLevel } from './SeatLevel';
import styles from './Climate.module.css';

const AIRFLOW_OPTIONS: { value: Airflow; label: string }[] = [
  { value: 'face', label: 'Face' },
  { value: 'face-feet', label: 'Face + Feet' },
  { value: 'feet', label: 'Feet' },
  { value: 'windshield', label: 'Windshield' },
];

const SEAT_OPTIONS: { seat: SeatId; label: string; icon: string }[] = [
  { seat: 'driver', label: 'Driver', icon: 'app-left-seat.svg' },
  { seat: 'passenger', label: 'Passenger', icon: 'app-right-seat.svg' },
  { seat: 'rear-left', label: 'Rear Left', icon: 'app-left-seat.svg' },
  { seat: 'rear-center', label: 'Rear Center', icon: 'app-left-seat.svg' },
  { seat: 'rear-right', label: 'Rear Right', icon: 'app-right-seat.svg' },
];

const OVERHEAT_OPTIONS: { value: OverheatProtection; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'no-ac', label: 'Fan Only' },
  { value: 'on', label: 'On' },
];

const MODE_HINTS: Record<ClimateMode, string> = {
  keep: 'Stays on after you leave',
  dog: 'Shows a note to passers-by',
  camp: 'Leaves music and screens on',
};

function Toggle({
  isOn,
  label,
  onPress,
  children,
}: {
  isOn: boolean;
  // For when the visible text alone wouldn't say what is being switched.
  label?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={label}
      aria-pressed={isOn}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function PanelHeader() {
  const isOn = useCar((state) => state.climate.cabin.isOn);
  const isAuto = useCar((state) => state.climate.cabin.isAuto);
  const { setCabin, closeModal } = useCarActions();

  return (
    <header className={styles.header}>
      <h2 className={styles.title}>Climate</h2>
      <Toggle isOn={isOn} label="Climate power" onPress={() => setCabin({ isOn: !isOn })}>
        {isOn ? 'On' : 'Off'}
      </Toggle>
      <Toggle isOn={isOn && isAuto} onPress={() => setCabin({ isAuto: !(isOn && isAuto) })}>
        Auto
      </Toggle>
      <button
        type="button"
        className={styles.close}
        aria-label="Close climate controls"
        onClick={closeModal}
      >
        ×
      </button>
    </header>
  );
}

function Stepper({ zone, label }: { zone: TemperatureZone; label: string }) {
  const temperature = useCar((state) =>
    zone === 'driver' ? state.climate.driverTemp : state.climate.passengerTemp,
  );
  const { stepTemperature } = useCarActions();

  return (
    <div className={styles.stepper} role="group" aria-label={`${label} temperature`}>
      <span className={styles.stepperLabel}>{label}</span>
      <div className={styles.stepperRow}>
        <button
          type="button"
          className={styles.stepperBtn}
          aria-label={`Lower ${label.toLowerCase()} temperature`}
          onClick={() => stepTemperature(zone, -1)}
        >
          −
        </button>
        <output className={styles.stepperValue}>{temperature}°</output>
        <button
          type="button"
          className={styles.stepperBtn}
          aria-label={`Raise ${label.toLowerCase()} temperature`}
          onClick={() => stepTemperature(zone, 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function TemperatureSection() {
  const isSplit = useCar((state) => state.climate.isSplit);
  const { setClimateOptions } = useCarActions();

  return (
    <Section title="Temperature">
      <div className={styles.temperatures}>
        <Stepper zone="driver" label={isSplit ? 'Driver' : 'Cabin'} />
        {isSplit && <Stepper zone="passenger" label="Passenger" />}
        <Toggle isOn={isSplit} onPress={() => setClimateOptions({ isSplit: !isSplit })}>
          Split
        </Toggle>
      </div>
    </Section>
  );
}

function AirflowSection() {
  const fanSpeed = useCar((state) => state.climate.cabin.fanSpeed);
  const airflow = useCar((state) => state.climate.cabin.airflow);
  const { setCabin } = useCarActions();

  return (
    <Section title="Fan and vents">
      <label className={styles.fan}>
        <Glyph icon="app-fan.svg" />
        <input
          type="range"
          className={styles.slider}
          min={MIN_FAN_SPEED}
          max={MAX_FAN_SPEED}
          value={fanSpeed}
          aria-label="Fan speed"
          onChange={(event) => setCabin({ fanSpeed: event.target.valueAsNumber })}
        />
        <output className={styles.fanValue}>{fanSpeed}</output>
      </label>
      <div className={styles.options} role="group" aria-label="Vents">
        {AIRFLOW_OPTIONS.map(({ value, label }) => (
          <Toggle key={value} isOn={airflow === value} onPress={() => setCabin({ airflow: value })}>
            {label}
          </Toggle>
        ))}
      </div>
    </Section>
  );
}

function DefrostToggle({
  window,
  isOn,
  label,
}: {
  window: DefrostWindow;
  isOn: boolean;
  label: string;
}) {
  const { toggleDefrost } = useCarActions();

  return (
    <Toggle isOn={isOn} onPress={() => toggleDefrost(window)}>
      <Glyph icon={`app-defrost-${window}.svg`} />
      {label}
    </Toggle>
  );
}

function AirSection() {
  const ac = useCar((state) => state.climate.cabin.ac);
  const recirculate = useCar((state) => state.climate.cabin.recirculate);
  const frontDefrost = useCar((state) => isFrontDefrostOn(state.climate));
  const rearDefrost = useCar((state) => state.climate.rearDefrost);
  const { setCabin } = useCarActions();

  return (
    <Section title="Air">
      <div className={styles.options}>
        <Toggle isOn={ac} onPress={() => setCabin({ ac: !ac })}>
          A/C
        </Toggle>
        <Toggle isOn={recirculate} onPress={() => setCabin({ recirculate: !recirculate })}>
          Recirculate
        </Toggle>
        <DefrostToggle window="front" isOn={frontDefrost} label="Front Defrost" />
        <DefrostToggle window="rear" isOn={rearDefrost} label="Rear Defrost" />
      </div>
    </Section>
  );
}

function SeatControl({ seat, label, icon }: { seat: SeatId; label: string; icon: string }) {
  const heat = useCar((state) => state.climate.seats[seat]);
  const { cycleSeat } = useCarActions();
  const hasCooling = COOLED_SEATS.includes(seat);

  return (
    <div className={styles.seat} data-cooled={hasCooling}>
      <button
        type="button"
        className={styles.seatBtn}
        aria-label={`${label} seat: ${seatHeatLabel(heat)}`}
        onClick={() => cycleSeat(seat, 'heat')}
      >
        <Glyph icon={icon} />
        <SeatLevel heat={heat} />
        <span>{label}</span>
      </button>
      {hasCooling && (
        <button
          type="button"
          className={styles.seatCool}
          aria-label={`Cool ${label.toLowerCase()} seat`}
          onClick={() => cycleSeat(seat, 'cool')}
        >
          Cool
        </button>
      )}
    </div>
  );
}

function SeatsSection() {
  const wheel = useCar((state) => state.climate.wheel);
  const isAuto = useCar((state) => isHeatAuto(state.climate));
  const { setClimateOptions, toggleHeatAuto } = useCarActions();

  return (
    <Section title="Seats and wheel">
      <div className={styles.seats}>
        {SEAT_OPTIONS.map((option) => (
          <SeatControl key={option.seat} {...option} />
        ))}
      </div>
      <div className={styles.options}>
        <Toggle
          isOn={wheel !== 'off'}
          onPress={() => setClimateOptions({ wheel: wheel === 'off' ? 'on' : 'off' })}
        >
          Heated Wheel{wheel === 'auto' ? ': Auto' : ''}
        </Toggle>
        <Toggle isOn={isAuto} onPress={toggleHeatAuto}>
          Auto Seats and Wheel
        </Toggle>
      </div>
    </Section>
  );
}

function ModesSection() {
  const mode = useCar((state) => state.climate.mode);
  const overheatProtection = useCar((state) => state.climate.overheatProtection);
  const { setClimateOptions, toggleClimateMode } = useCarActions();

  return (
    <Section title="While parked">
      <div className={styles.modes}>
        {CLIMATE_MODES.map((value) => (
          <button
            key={value}
            type="button"
            className={styles.mode}
            aria-pressed={mode === value}
            onClick={() => toggleClimateMode(value)}
          >
            <span className={styles.modeName}>{CLIMATE_MODE_LABELS[value]}</span>
            <span className={styles.modeHint}>{MODE_HINTS[value]}</span>
          </button>
        ))}
      </div>
      <div className={styles.overheat} role="group" aria-label="Cabin Overheat Protection">
        <span className={styles.stepperLabel}>Cabin Overheat Protection</span>
        <div className={styles.options}>
          {OVERHEAT_OPTIONS.map(({ value, label }) => (
            <Toggle
              key={value}
              isOn={overheatProtection === value}
              onPress={() => setClimateOptions({ overheatProtection: value })}
            >
              {label}
            </Toggle>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function ClimatePanel() {
  return (
    <div className={styles.panel}>
      <PanelHeader />
      <div className={styles.sections}>
        <TemperatureSection />
        <AirflowSection />
        <AirSection />
        <SeatsSection />
        <ModesSection />
      </div>
    </div>
  );
}
