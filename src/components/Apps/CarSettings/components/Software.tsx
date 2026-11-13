import { useState } from 'react';
import changelog from '../../../../../CHANGELOG.md?raw';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { MAX_NAME_LENGTH, type UpdatePreference } from '../../../../state/carState';
import { VEHICLE_INFO } from '../../../../state/sampleData';
import { parseReleaseNotes } from '../../../../utils/releaseNotes';
import { formatDistanceFixed } from '../../../../utils/units';
import {
  Button,
  Choice,
  DemoNote,
  NameForm,
  Page,
  ProgressBar,
  Row,
  Section,
  Stat,
  Stats,
  panelStyles,
} from './SystemPanel';

const PREFERENCE_OPTIONS: { value: UpdatePreference; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced' },
];

const RELEASES = parseReleaseNotes(changelog);

function VehicleDetails() {
  const name = useCar((state) => state.settings.vehicleName);
  const odometer = useCar((state) => state.odometerMiles);
  const units = useCar((state) => state.settings.preferences.distance);
  const installed = useCar((state) => state.installedUpdate);
  const { setSettings } = useCarActions();

  return (
    <Section title={name}>
      <Stats>
        <Stat label="Version" value={__APP_VERSION__} />
        <Stat label="Build" value={__GIT_SHA__} />
        <Stat label="Odometer" value={formatDistanceFixed(odometer, units, 0)} />
        <Stat label="VIN" value={VEHICLE_INFO.vin} />
        {installed && <Stat label="Simulated Update" value={installed} />}
      </Stats>
      <NameForm
        key={name}
        label="Name Your Vehicle"
        submitLabel="Save"
        initialValue={name}
        maxLength={MAX_NAME_LENGTH}
        onSubmit={(vehicleName) => setSettings({ vehicleName })}
      />
    </Section>
  );
}

function UpdateProgress() {
  const update = useCar((state) => state.softwareUpdate);
  const { checkForUpdate, downloadUpdate, installUpdate } = useCarActions();

  switch (update.phase) {
    case 'idle':
      return <Button onPress={checkForUpdate}>Check for Updates</Button>;
    case 'checking':
      return (
        <>
          <Row label="Checking for updates…" />
          <ProgressBar label="Checking for updates" percent={update.progress} />
        </>
      );
    case 'available':
      return (
        <Row label={`${update.version} is available`}>
          <Button variant="primary" onPress={downloadUpdate}>
            Download
          </Button>
        </Row>
      );
    case 'downloading':
      return (
        <>
          <Row label={`Downloading ${update.version}…`} />
          <ProgressBar label="Download progress" percent={update.progress} />
        </>
      );
    case 'ready':
      return (
        <Row label={`${update.version} is ready`} hint="The car has to stay in Park to install.">
          <Button variant="primary" onPress={installUpdate}>
            Install Now
          </Button>
        </Row>
      );
    case 'installing':
      return (
        <>
          <Row
            label={`Installing ${update.version}…`}
            hint="The car can't leave Park until done."
          />
          <ProgressBar label="Install progress" percent={update.progress} />
        </>
      );
  }
}

function Updates() {
  const preference = useCar((state) => state.settings.updatePreference);
  const { setSettings } = useCarActions();

  return (
    <Section title="Software Update">
      <DemoNote>Demo only: nothing is downloaded, and this app stays on the same build.</DemoNote>
      <Choice
        label="Update Preference"
        hint="Advanced gets new software sooner."
        value={preference}
        options={PREFERENCE_OPTIONS}
        onChange={(updatePreference) => setSettings({ updatePreference })}
      />
      <UpdateProgress />
    </Section>
  );
}

function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Section title="Release Notes">
      <div>
        <Button onPress={() => setIsOpen(!isOpen)}>{isOpen ? 'Hide' : 'Show'} Release Notes</Button>
      </div>
      {isOpen && (
        <div className={panelStyles.prose}>
          {RELEASES.map((release) => (
            <div key={release.title}>
              <h3>{release.title}</h3>
              {release.groups.map((group) => (
                <div key={group.title}>
                  <h4>{group.title}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// Project credits, kept apart from the car's own screens above.
const About = () => {
  return (
    <div className={panelStyles.section}>
      <div className={panelStyles.prose}>
        <h3>About:</h3>
        <p>
          Unofficial fan project, not affiliated with or endorsed by Tesla, Inc. Tesla and all
          related names, logos and trademarks belong to their respective owners.
        </p>

        <h3>Contributing:</h3>
        <p>
          We welcome contributions! Check out the source code and contribute on{' '}
          <a
            href="https://github.com/jamesalmeida/tesla-infotainment"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          !
        </p>

        <h3>Thanks:</h3>
        <ul>
          <li>
            Ameer Studio for sharing the{' '}
            <a
              href="https://sketchfab.com/3d-models/tesla-2018-model-3-5ef9b845aaf44203b6d04e2c677e444f"
              target="_blank"
              rel="noopener noreferrer"
            >
              3D model of the Tesla Model 3
            </a>
          </li>
          <li>
            BloxBloger for sharing the{' '}
            <a
              href="https://sketchfab.com/3d-models/2026-tesla-model-y-performance-8a0bc252f9da4015a02a7bd99efd4847"
              target="_blank"
              rel="noopener noreferrer"
            >
              3D model of the 2026 Tesla Model Y Performance
            </a>{' '}
            (CC BY-NC 4.0; cut into doors, lids and wheels for this simulator)
          </li>
        </ul>
      </div>
    </div>
  );
};

export const Software = () => (
  <Page title="Software">
    <div className={panelStyles.twoColumns}>
      <VehicleDetails />
      <Updates />
    </div>
    <ReleaseNotes />
    <About />
  </Page>
);
