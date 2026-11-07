import { useState } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import {
  effectiveCabin,
  isValet,
  MAX_NAME_LENGTH,
  VALET_MAX_SPEED,
} from '../../../../state/carState';
import type { CabinPosition, Profile } from '../../../../state/carState';
import { isDriverProfile, MAX_PROFILES } from '../../../../state/profiles';
import {
  Button,
  ButtonRow,
  DemoNote,
  NameForm,
  Page,
  PinForm,
  Row,
  Section,
  Slider,
  Toggle,
  panelStyles,
} from './SystemPanel';

const CABIN_CONTROLS: { group: string; items: { key: keyof CabinPosition; label: string }[] }[] = [
  {
    group: 'Seat',
    items: [
      { key: 'seatPosition', label: 'Seat Position' },
      { key: 'seatHeight', label: 'Seat Height' },
      { key: 'seatRecline', label: 'Seat Recline' },
    ],
  },
  {
    group: 'Mirrors',
    items: [
      { key: 'mirrorTilt', label: 'Mirror Tilt' },
      { key: 'mirrorPan', label: 'Mirror Angle' },
    ],
  },
  {
    group: 'Steering',
    items: [
      { key: 'steeringTilt', label: 'Wheel Height' },
      { key: 'steeringReach', label: 'Wheel Reach' },
    ],
  },
];

function Driver({ profile, isOnly }: { profile: Profile; isOnly: boolean }) {
  const isActive = useCar((state) => state.activeProfileId === profile.id);
  const { deleteProfile, renameProfile, selectProfile } = useCarActions();
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <li className={panelStyles.listItem}>
      {isRenaming ? (
        <NameForm
          label={`New name for ${profile.name}`}
          submitLabel="Save"
          initialValue={profile.name}
          maxLength={MAX_NAME_LENGTH}
          onSubmit={(name) => {
            renameProfile(profile.id, name);
            setIsRenaming(false);
          }}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <Row label={profile.name} hint={isActive ? 'Current driver' : undefined} />
      )}
      <ButtonRow>
        <Button
          label={`Use ${profile.name}`}
          variant="primary"
          disabled={isActive}
          onPress={() => selectProfile(profile.id)}
        >
          Use
        </Button>
        <Button label={`Rename ${profile.name}`} onPress={() => setIsRenaming(true)}>
          Rename
        </Button>
        <Button
          label={`Delete ${profile.name}`}
          variant="danger"
          disabled={isOnly}
          onPress={() => deleteProfile(profile.id)}
        >
          Delete
        </Button>
      </ButtonRow>
    </li>
  );
}

function Drivers() {
  const profiles = useCar((state) => state.profiles);
  const { addProfile } = useCarActions();
  const drivers = profiles.filter(isDriverProfile);

  return (
    <Section title="Drivers" hint="Each driver keeps their own positions and preferences.">
      <ul className={panelStyles.list}>
        {drivers.map((profile) => (
          <Driver key={profile.id} profile={profile} isOnly={drivers.length === 1} />
        ))}
      </ul>
      {profiles.length < MAX_PROFILES && (
        <NameForm
          label="New driver"
          submitLabel="Add"
          maxLength={MAX_NAME_LENGTH}
          onSubmit={addProfile}
        />
      )}
    </Section>
  );
}

function Positions() {
  const cabin = useCar((state) => state.cabin);
  const shown = useCar(effectiveCabin);
  const isEasyEntry = useCar((state) => state.easyEntryActive);
  const easyEntry = useCar((state) => state.settings.easyEntry);
  const { setCabinPosition, setSettings } = useCarActions();

  return (
    <Section title="Seat, Mirrors and Steering" hint="Saved for the current driver.">
      <Toggle
        label="Easy Entry"
        hint={
          isEasyEntry
            ? 'Seat back and wheel up. They return when you leave Park.'
            : 'Makes room to get out each time you shift to Park.'
        }
        checked={easyEntry}
        onChange={(value) => setSettings({ easyEntry: value })}
      />
      {CABIN_CONTROLS.map(({ group, items }) => (
        <div key={group} className={panelStyles.stackedRow}>
          {items.map(({ key, label }) => (
            <Slider
              key={key}
              label={label}
              value={isEasyEntry ? shown[key] : cabin[key]}
              min={0}
              max={100}
              disabled={isEasyEntry}
              onChange={(value) => setCabinPosition({ [key]: value })}
            />
          ))}
        </div>
      ))}
    </Section>
  );
}

function Valet() {
  const active = useCar(isValet);
  const { enterValet, exitValet, resetPins } = useCarActions();

  return (
    <Section
      title="Valet Mode"
      hint={`Limits speed to ${VALET_MAX_SPEED} mph, slows acceleration and hides personal data. Park only.`}
    >
      <DemoNote>
        Demo only: the PIN is kept unencrypted in this browser. Don't use a real one.
      </DemoNote>
      {active ? (
        <>
          <PinForm label="Valet PIN" submitLabel="Exit Valet Mode" onSubmit={exitValet} />
          <ButtonRow>
            <Button onPress={resetPins}>Forgot PIN? Clear PINs</Button>
          </ButtonRow>
        </>
      ) : (
        <PinForm label="Choose a Valet PIN" submitLabel="Start Valet Mode" onSubmit={enterValet} />
      )}
    </Section>
  );
}

export const Profiles = () => {
  const active = useCar(isValet);

  return (
    <Page title="Profiles">
      <Valet />
      {!active && (
        <div className={panelStyles.twoColumns}>
          <Drivers />
          <Positions />
        </div>
      )}
    </Page>
  );
};
