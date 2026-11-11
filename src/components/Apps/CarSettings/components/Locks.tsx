import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { CarKey, ChildLock, KeyKind } from '../../../../state/carState';
import {
  ActionButton,
  ActionRow,
  Panel,
  Section,
  Segmented,
  Toggle,
  type Choice,
} from './SettingsKit';

const KEY_LABELS: Record<KeyKind, string> = {
  phone: 'Phone key',
  card: 'Key card',
  fob: 'Key fob',
};

const KEY_KINDS: KeyKind[] = ['phone', 'card', 'fob'];

const CHILD_LOCK: Choice<ChildLock>[] = [
  { value: 'off', label: 'Off' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
];

const nextKeyId = (keys: CarKey[]) => Math.max(0, ...keys.map((key) => key.id)) + 1;

function KeyList() {
  const keys = useCar((state) => state.settings.keys);
  const { setSettings } = useCarActions();

  const addKey = (kind: KeyKind) => {
    const count = keys.filter((key) => key.kind === kind).length;
    const name = count ? `${KEY_LABELS[kind]} ${count + 1}` : KEY_LABELS[kind];
    setSettings({ keys: [...keys, { id: nextKeyId(keys), kind, name }] });
  };

  return (
    <Section title="Keys">
      <div data-setting="keys">
        {keys.map((key) => (
          <ActionRow key={key.id} setting={`key-${key.id}`} label={key.name} inline>
            <ActionButton
              onClick={() => setSettings({ keys: keys.filter(({ id }) => id !== key.id) })}
            >
              Remove
            </ActionButton>
          </ActionRow>
        ))}
      </div>
      <ActionRow setting="add-key" label="Add a Key">
        {KEY_KINDS.map((kind) => (
          <ActionButton key={kind} onClick={() => addKey(kind)}>
            {KEY_LABELS[kind]}
          </ActionButton>
        ))}
      </ActionRow>
    </Section>
  );
}

export const Locks = () => {
  const settings = useCar((state) => state.settings);
  const isLocked = useCar((state) => state.isLocked);
  const { setSettings, toggleLock, walkAway } = useCarActions();

  return (
    <Panel>
      <ActionRow setting="door-locks" label={isLocked ? 'Car is locked' : 'Car is unlocked'} inline>
        <ActionButton primary onClick={toggleLock}>
          {isLocked ? 'Unlock' : 'Lock'}
        </ActionButton>
      </ActionRow>

      <KeyList />

      <Section title="Automatic locking">
        <Toggle
          setting="walk-away-lock"
          label="Walk-Away Door Lock"
          description="Locks the car when you leave it with your key."
          checked={settings.walkAwayLock}
          onChange={(walkAwayLock) => setSettings({ walkAwayLock })}
        />
        <ActionRow
          setting="walk-away-test"
          label="Walk Away from the Car"
          description="Try it out: the car has to be unlocked and in Park."
        >
          <ActionButton onClick={walkAway}>Walk Away</ActionButton>
        </ActionRow>
        <Toggle
          setting="drive-away-lock"
          label="Drive-Away Lock"
          description="Locks the doors when you shift into Drive."
          checked={settings.driveAwayLock}
          onChange={(driveAwayLock) => setSettings({ driveAwayLock })}
        />
        <Toggle
          setting="unlock-on-park"
          label="Unlock on Park"
          description="Unlocks the doors when you shift into Park."
          checked={settings.unlockOnPark}
          onChange={(unlockOnPark) => setSettings({ unlockOnPark })}
        />
        <Toggle
          setting="lock-sound"
          label="Lock Confirmation Sound"
          description="Chimes when the car locks in Park."
          checked={settings.lockSound}
          onChange={(lockSound) => setSettings({ lockSound })}
        />
      </Section>

      <Section title="Passengers">
        <Segmented
          setting="locks-child-lock"
          label="Child Lock"
          description="Stops the rear doors opening from inside."
          value={settings.childLock}
          options={CHILD_LOCK}
          onChange={(childLock) => setSettings({ childLock })}
        />
        <Toggle
          setting="locks-window-lock"
          label="Window Lock"
          description="Stops passengers using their window switches."
          checked={settings.windowLock}
          onChange={(windowLock) => setSettings({ windowLock })}
        />
      </Section>
    </Panel>
  );
};
