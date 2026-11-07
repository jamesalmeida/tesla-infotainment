import { useState, type FormEvent } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { wifiIndicator, type WifiIndicator } from '../../../../state/carState';
import { HOTSPOT_PASSWORD, WIFI_NETWORKS, type WifiNetwork } from '../../../../state/sampleData';
import { Button, DemoNote, Page, Row, Section, Toggle, panelStyles } from './SystemPanel';
import { ValetHidden } from './ValetHidden';

const STATUS_LABELS: Record<WifiIndicator, string> = {
  off: 'Off',
  disconnected: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
};

const signalLabel = (network: WifiNetwork) =>
  `${network.signal} of 4 bars, ${network.password ? 'secured' : 'open'}`;

function PasswordForm({
  network,
  onConnect,
  onCancel,
}: {
  network: WifiNetwork;
  onConnect: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password) onConnect(password);
  };

  return (
    <form className={panelStyles.inlineForm} onSubmit={handleSubmit}>
      <input
        className={panelStyles.input}
        type="password"
        autoComplete="off"
        aria-label={`Password for ${network.ssid}`}
        placeholder={`Sample password: ${network.password}`}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" variant="primary" disabled={!password}>
        Join
      </Button>
      <Button onPress={onCancel}>Cancel</Button>
    </form>
  );
}

function Network({ network }: { network: WifiNetwork }) {
  const isConnected = useCar((state) => state.wifi.connectedId === network.id);
  const isConnecting = useCar((state) => state.wifi.attempt?.networkId === network.id);
  const isSaved = useCar((state) => state.wifi.savedIds.includes(network.id));
  const error = useCar((state) =>
    state.wifi.error?.networkId === network.id ? state.wifi.error.message : null,
  );
  const { connectWifi, disconnectWifi, forgetWifi } = useCarActions();
  const [isAsking, setIsAsking] = useState(false);

  const handleJoin = () => {
    if (network.password && !isSaved) setIsAsking(true);
    else connectWifi(network.id, '');
  };

  const connect = (password: string) => {
    connectWifi(network.id, password);
    setIsAsking(false);
  };

  let status = signalLabel(network);
  if (isConnecting) status = 'Connecting…';
  else if (isConnected) status = 'Connected';
  else if (isSaved) status = `Saved. ${status}`;

  return (
    <li className={panelStyles.listItem}>
      <Row label={network.ssid} hint={status}>
        {isConnected ? (
          <Button label={`Disconnect from ${network.ssid}`} onPress={disconnectWifi}>
            Disconnect
          </Button>
        ) : (
          <Button
            label={`Join ${network.ssid}`}
            variant="primary"
            disabled={isConnecting}
            onPress={handleJoin}
          >
            Join
          </Button>
        )}
        {isSaved && (
          <Button label={`Forget ${network.ssid}`} onPress={() => forgetWifi(network.id)}>
            Forget
          </Button>
        )}
      </Row>
      {error && (
        <p className={panelStyles.error} role="alert">
          {error}
        </p>
      )}
      {isAsking && (
        <PasswordForm network={network} onConnect={connect} onCancel={() => setIsAsking(false)} />
      )}
    </li>
  );
}

function Hotspot() {
  const hotspot = useCar((state) => state.wifi.hotspot);
  const name = useCar((state) => state.settings.vehicleName);
  const { setHotspot } = useCarActions();

  return (
    <Section title="Hotspot">
      <Toggle
        label="Share Connection"
        hint="Lets passengers' devices join the car."
        checked={hotspot}
        onChange={setHotspot}
      />
      {hotspot && <Row label={`${name} Hotspot`} hint={`Sample password: ${HOTSPOT_PASSWORD}`} />}
    </Section>
  );
}

export const Wifi = () => {
  const enabled = useCar((state) => state.wifi.enabled);
  const indicator = useCar(wifiIndicator);
  const { setWifiEnabled } = useCarActions();

  return (
    <Page title="Wifi">
      <DemoNote>Demo only: these networks are invented and nothing connects to anything.</DemoNote>
      <ValetHidden what="Wifi">
        <Section>
          <Toggle
            label="Wifi"
            hint={STATUS_LABELS[indicator]}
            checked={enabled}
            onChange={setWifiEnabled}
          />
        </Section>
        {enabled && (
          <Section title="Networks">
            <ul className={panelStyles.list}>
              {WIFI_NETWORKS.map((network) => (
                <Network key={network.id} network={network} />
              ))}
            </ul>
          </Section>
        )}
        <Hotspot />
      </ValetHidden>
    </Page>
  );
};
