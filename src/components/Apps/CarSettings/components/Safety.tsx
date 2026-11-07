import { useState } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  isParked,
  MAX_SPEED,
  MIN_SPEED_LIMIT,
  type OverheatProtection,
  type CollisionWarning,
} from '../../../../state/carState';
import {
  Button,
  ButtonRow,
  Choice,
  DemoNote,
  Page,
  PinForm,
  Row,
  Section,
  Slider,
  Toggle,
  panelStyles,
} from './SystemPanel';

const OVERHEAT_OPTIONS: { value: OverheatProtection; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'no-ac', label: 'Fan Only' },
  { value: 'on', label: 'On' },
];

const COLLISION_OPTIONS: { value: CollisionWarning; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'late', label: 'Late' },
  { value: 'average', label: 'Average' },
  { value: 'early', label: 'Early' },
];

// A mode with a PIN: choosing it asks for one, and only that PIN turns it off again.
function PinMode({
  label,
  hint,
  isOn,
  onEnable,
  onDisable,
}: {
  label: string;
  hint: string;
  isOn: boolean;
  onEnable: (pin: string) => void;
  onDisable: (pin: string) => void;
}) {
  // Remembers which way the switch was going, so the form leaves once the mode changes and
  // stays for another try after a wrong PIN.
  const [askedWhile, setAskedWhile] = useState<boolean | null>(null);
  const isAsking = askedWhile === isOn;

  return (
    <>
      <Row label={label} hint={hint}>
        <Button
          label={`${isOn ? 'Turn off' : 'Turn on'} ${label}`}
          variant={isOn ? 'default' : 'primary'}
          onPress={() => setAskedWhile(isAsking ? null : isOn)}
        >
          {isOn ? 'Turn Off' : 'Turn On'}
        </Button>
      </Row>
      {isAsking && (
        <PinForm
          label={isOn ? `PIN to turn off ${label}` : `Choose a PIN for ${label}`}
          submitLabel={isOn ? 'Turn Off' : 'Turn On'}
          onSubmit={isOn ? onDisable : onEnable}
          onCancel={() => setAskedWhile(null)}
        />
      )}
    </>
  );
}

function Restrictions() {
  const settings = useCar((state) => state.settings);
  const parked = useCar(isParked);
  const {
    disablePinToDrive,
    disableSpeedLimit,
    enablePinToDrive,
    enableSpeedLimit,
    resetPins,
    setRequireSafetyFeatures,
    setSettings,
  } = useCarActions();

  return (
    <Section title="Driver Limits" hint="These can only be changed in Park.">
      <DemoNote>
        Demo only: PINs are kept unencrypted in this browser. Don't use a real one.
      </DemoNote>
      <Slider
        label="Speed Limit"
        value={settings.speedLimitMph}
        min={MIN_SPEED_LIMIT}
        max={MAX_SPEED}
        step={5}
        disabled={settings.speedLimitMode || !parked}
        format={(value) => `${value} mph`}
        onChange={(speedLimitMph) => setSettings({ speedLimitMph })}
      />
      <PinMode
        label="Speed Limit Mode"
        hint={
          settings.speedLimitMode
            ? `On. The car stops accelerating at ${settings.speedLimitMph} mph.`
            : 'Holds the car to the speed above.'
        }
        isOn={settings.speedLimitMode}
        onEnable={enableSpeedLimit}
        onDisable={disableSpeedLimit}
      />
      <PinMode
        label="PIN to Drive"
        hint={
          settings.pinToDrive
            ? 'On. The car asks for the PIN before leaving Park.'
            : 'Asks for a PIN before the car can leave Park.'
        }
        isOn={settings.pinToDrive}
        onEnable={enablePinToDrive}
        onDisable={disablePinToDrive}
      />
      <Toggle
        label="Require Safety Features"
        hint="Stops the warnings below from being turned off."
        checked={settings.requireSafetyFeatures}
        onChange={setRequireSafetyFeatures}
      />
      {(settings.speedLimitMode || settings.pinToDrive) && (
        <ButtonRow>
          <Button onPress={resetPins}>Forgot PIN? Clear PINs</Button>
        </ButtonRow>
      )}
    </Section>
  );
}

export const Safety = () => {
  const settings = useCar((state) => state.settings);
  const overheatProtection = useCar((state) => state.climate.overheatProtection);
  const { setClimateOptions, setSettings } = useCarActions();
  const locked = settings.requireSafetyFeatures;
  const lockedHint = locked ? 'Required by Driver Limits.' : undefined;

  return (
    <Page title="Safety">
      <div className={panelStyles.twoColumns}>
        <Section title="Security">
          <Toggle
            label="Sentry Mode"
            hint="Watches the car's surroundings while parked."
            checked={settings.sentry}
            onChange={(sentry) => setSettings({ sentry })}
          />
          <Toggle
            label="Joe Mode"
            hint="Turns chimes down for sleeping passengers."
            checked={settings.joeMode}
            onChange={(joeMode) => setSettings({ joeMode })}
          />
          <Choice
            label="Cabin Overheat Protection"
            hint="Keeps a parked car from getting too hot inside."
            value={overheatProtection}
            options={OVERHEAT_OPTIONS}
            onChange={(protection) => setClimateOptions({ overheatProtection: protection })}
          />
        </Section>
        <Section title="Warnings">
          <Toggle
            label="Blind Spot Warning"
            hint={lockedHint}
            checked={settings.blindSpotWarning}
            disabled={locked}
            onChange={(blindSpotWarning) => setSettings({ blindSpotWarning })}
          />
          <Toggle
            label="Automatic Emergency Braking"
            hint={lockedHint}
            checked={settings.emergencyBraking}
            disabled={locked}
            onChange={(emergencyBraking) => setSettings({ emergencyBraking })}
          />
          <Choice
            label="Collision Warning"
            hint={lockedHint}
            value={settings.collisionWarning}
            options={
              locked ? COLLISION_OPTIONS.filter(({ value }) => value !== 'off') : COLLISION_OPTIONS
            }
            onChange={(collisionWarning) => setSettings({ collisionWarning })}
          />
        </Section>
      </div>
      <Restrictions />
    </Page>
  );
};
