import { useCar, useCarActions } from '../../../state/CarStateContext';
import { bluetoothMediaSource } from '../../../state/carState';
import {
  BLUETOOTH_DEVICES,
  findBluetoothDevice,
  type BluetoothDevice,
} from '../../../state/sampleData';
import {
  Button,
  ButtonRow,
  DemoNote,
  Page,
  Row,
  Section,
  Toggle,
  panelStyles,
} from '../CarSettings/components/SystemPanel';
import { ValetHidden } from '../CarSettings/components/ValetHidden';

const KIND_LABELS: Record<BluetoothDevice['kind'], string> = {
  phone: 'Phone',
  headphones: 'Headphones',
  tablet: 'Tablet',
};

function PairingPrompt() {
  const pairing = useCar((state) => state.bluetooth.pairing);
  const { cancelBluetoothPairing, confirmBluetoothPairing } = useCarActions();
  const device = pairing ? findBluetoothDevice(pairing.deviceId) : undefined;
  if (!pairing || !device) return null;

  return (
    <Section title={`Pair with ${device.name}`}>
      {pairing.phase === 'confirm' ? (
        <>
          <Row label={device.code} hint="Check that the device shows the same code." />
          <ButtonRow>
            <Button variant="primary" onPress={confirmBluetoothPairing}>
              Codes Match
            </Button>
            <Button onPress={cancelBluetoothPairing}>Cancel</Button>
          </ButtonRow>
        </>
      ) : (
        <p className={panelStyles.hint}>Pairing…</p>
      )}
    </Section>
  );
}

function PairedDevice({ device }: { device: BluetoothDevice }) {
  const isConnected = useCar((state) => state.bluetooth.connectedId === device.id);
  const isPriority = useCar((state) => state.bluetooth.priorityId === device.id);
  const { connectBluetooth, disconnectBluetooth, forgetBluetooth, setPriorityBluetooth } =
    useCarActions();

  const status = [
    isConnected ? 'Connected' : 'Not connected',
    isPriority ? 'Priority device' : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <li className={panelStyles.listItem}>
      <Row label={device.name} hint={status} />
      <ButtonRow>
        {isConnected ? (
          <Button label={`Disconnect ${device.name}`} onPress={disconnectBluetooth}>
            Disconnect
          </Button>
        ) : (
          <Button
            label={`Connect ${device.name}`}
            variant="primary"
            onPress={() => connectBluetooth(device.id)}
          >
            Connect
          </Button>
        )}
        <Button
          label={`Make ${device.name} the priority device`}
          disabled={isPriority}
          onPress={() => setPriorityBluetooth(device.id)}
        >
          Set Priority
        </Button>
        <Button
          label={`Forget ${device.name}`}
          variant="danger"
          onPress={() => forgetBluetooth(device.id)}
        >
          Forget
        </Button>
      </ButtonRow>
    </li>
  );
}

function NearbyDevice({ device }: { device: BluetoothDevice }) {
  const isPairing = useCar((state) => state.bluetooth.pairing?.deviceId === device.id);
  const error = useCar((state) =>
    state.bluetooth.error?.deviceId === device.id ? state.bluetooth.error.message : null,
  );
  const { pairBluetooth } = useCarActions();

  return (
    <li className={panelStyles.listItem}>
      <Row label={device.name} hint={KIND_LABELS[device.kind]}>
        <Button
          label={`Pair ${device.name}`}
          variant="primary"
          disabled={isPairing}
          onPress={() => pairBluetooth(device.id)}
        >
          Pair
        </Button>
      </Row>
      {error && (
        <p className={panelStyles.error} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

// The Bluetooth app and the Settings panel are the same screen, on the same store slice.
export const BluetoothDevices = () => {
  const enabled = useCar((state) => state.bluetooth.enabled);
  const pairedIds = useCar((state) => state.bluetooth.pairedIds);
  const mediaSource = useCar(bluetoothMediaSource);
  const { setBluetoothEnabled } = useCarActions();

  const paired = BLUETOOTH_DEVICES.filter((device) => pairedIds.includes(device.id));
  const nearby = BLUETOOTH_DEVICES.filter((device) => !pairedIds.includes(device.id));

  return (
    <Page title="Bluetooth">
      <DemoNote>Demo only: these devices are invented and nothing is really paired.</DemoNote>
      <ValetHidden what="Bluetooth">
        <Section>
          <Toggle
            label="Bluetooth"
            hint={mediaSource ? `Playing from ${mediaSource}` : undefined}
            checked={enabled}
            onChange={setBluetoothEnabled}
          />
        </Section>
        {enabled && (
          <>
            <PairingPrompt />
            <Section title="My Devices">
              {paired.length > 0 ? (
                <ul className={panelStyles.list}>
                  {paired.map((device) => (
                    <PairedDevice key={device.id} device={device} />
                  ))}
                </ul>
              ) : (
                <p className={panelStyles.hint}>Nothing paired yet.</p>
              )}
            </Section>
            {nearby.length > 0 && (
              <Section title="Nearby">
                <ul className={panelStyles.list}>
                  {nearby.map((device) => (
                    <NearbyDevice key={device.id} device={device} />
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </ValetHidden>
    </Page>
  );
};
