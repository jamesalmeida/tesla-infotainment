import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  chargeHoursRemaining,
  chargeKilowatts,
  isChargeCableIn,
  MAX_CHARGE_AMPS,
  MAX_CHARGE_LIMIT,
  MIN_CHARGE_AMPS,
  MIN_CHARGE_LIMIT,
  rangeMiles,
  sessionKwh,
  sessionMiles,
  type ChargeState,
} from '../../../../state/carState';
import { formatClockTime, formatDistance, formatDuration } from '../../../../utils/units';
import {
  ActionButton,
  ActionRow,
  Note,
  Panel,
  Section,
  Slider,
  Stats,
  Toggle,
} from './SettingsKit';
import styles from './SettingsKit.module.css';

const CHARGE_LABELS: Record<ChargeState, string> = {
  unplugged: 'Not plugged in',
  charging: 'Charging',
  scheduled: 'Waiting for the scheduled time',
  stopped: 'Charging stopped',
  complete: 'Charging complete',
};

function ChargeControls() {
  const chargeState = useCar((state) => state.chargeState);
  const isCableIn = useCar(isChargeCableIn);
  const isPortOpen = useCar((state) => state.chargePortOpen);
  const { plugIn, toggleChargePort, toggleCharging, unplug } = useCarActions();

  return (
    <ActionRow
      setting="charge-port"
      label="Charge Port"
      description={isPortOpen ? 'Open' : 'Closed and locked'}
    >
      {!isCableIn && (
        <ActionButton onClick={toggleChargePort}>
          {isPortOpen ? 'Close Port' : 'Open Port'}
        </ActionButton>
      )}
      {isCableIn ? (
        <ActionButton onClick={unplug}>Unlock and Unplug</ActionButton>
      ) : (
        <ActionButton primary onClick={plugIn}>
          Plug In Cable
        </ActionButton>
      )}
      {chargeState === 'charging' && (
        <ActionButton onClick={toggleCharging}>Stop Charging</ActionButton>
      )}
      {(chargeState === 'stopped' || chargeState === 'scheduled') && (
        <ActionButton primary onClick={toggleCharging}>
          Start Now
        </ActionButton>
      )}
    </ActionRow>
  );
}

function ChargeSessionStats() {
  const session = useCar((state) => state.chargeSession);
  const preferences = useCar((state) => state.settings.preferences);
  const kilowatts = useCar(chargeKilowatts);
  const isCharging = useCar((state) => state.chargeState === 'charging');

  if (!session) {
    return <Note>Stats appear here once the car has been plugged in.</Note>;
  }

  return (
    <div data-setting="charge-session">
      <Stats
        items={[
          { label: 'Energy added', value: `${sessionKwh(session).toFixed(1)} kWh` },
          { label: 'Range added', value: formatDistance(sessionMiles(session), preferences) },
          {
            label: 'Time charging',
            value: session.hours > 0 ? formatDuration(session.hours) : '0 min',
          },
          { label: 'Power', value: isCharging ? `${kilowatts.toFixed(1)} kW` : '0 kW' },
        ]}
      />
    </div>
  );
}

export const Charging = () => {
  const settings = useCar((state) => state.settings);
  const batteryPercent = useCar((state) => Math.round(state.batteryPercent));
  const miles = useCar(rangeMiles);
  const chargeState = useCar((state) => state.chargeState);
  const hoursRemaining = useCar(chargeHoursRemaining);
  const kilowatts = useCar(chargeKilowatts);
  const { setSettings } = useCarActions();
  const { preferences } = settings;

  const timeLeft =
    chargeState === 'charging' && hoursRemaining !== null
      ? ` · ${formatDuration(hoursRemaining)} to ${settings.chargeLimit}%`
      : '';

  return (
    <Panel>
      <Section title="Battery">
        <Stats
          items={[
            { label: 'Charge', value: `${batteryPercent}%` },
            { label: 'Estimated range', value: formatDistance(miles, preferences) },
          ]}
        />
        <Note>
          {CHARGE_LABELS[chargeState]}
          {timeLeft}
        </Note>
        <ChargeControls />
      </Section>

      <Section title="Charge settings">
        <Slider
          setting="charge-limit"
          label="Charge Limit"
          min={MIN_CHARGE_LIMIT}
          max={MAX_CHARGE_LIMIT}
          value={settings.chargeLimit}
          valueLabel={`${settings.chargeLimit}%`}
          onChange={(chargeLimit) => setSettings({ chargeLimit })}
        />
        <Slider
          setting="charge-current"
          label="Charge Current"
          min={MIN_CHARGE_AMPS}
          max={MAX_CHARGE_AMPS}
          value={settings.chargeCurrent}
          valueLabel={`${settings.chargeCurrent} A · ${kilowatts.toFixed(1)} kW`}
          onChange={(chargeCurrent) => setSettings({ chargeCurrent })}
        />
        <Toggle
          setting="charge-schedule"
          label="Scheduled Charging"
          description={
            settings.scheduledCharging
              ? `Plugged in, the car waits until ${formatClockTime(settings.scheduledChargeTime, preferences.timeFormat)}.`
              : 'Plugged in, the car starts charging straight away.'
          }
          checked={settings.scheduledCharging}
          onChange={(scheduledCharging) => setSettings({ scheduledCharging })}
        />
        {settings.scheduledCharging && (
          <label className={styles.row}>
            <span className={styles.label}>Start Time</span>
            <input
              className={styles.button}
              type="time"
              required
              value={settings.scheduledChargeTime}
              onChange={(event) => {
                if (event.target.value) setSettings({ scheduledChargeTime: event.target.value });
              }}
            />
          </label>
        )}
      </Section>

      <Section title="This session">
        <ChargeSessionStats />
        <Note>
          A session runs much faster here than in a real car. Times are what the same charge would
          take at the power shown.
        </Note>
      </Section>
    </Panel>
  );
};
