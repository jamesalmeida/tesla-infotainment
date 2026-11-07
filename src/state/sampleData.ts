// Invented data for the simulated systems. None of this describes a real car, network,
// device or product.

export interface WifiNetwork {
  id: string;
  ssid: string;
  // 1 to 4 bars.
  signal: number;
  // Sample password, shown in the panel so the demo can be completed. Null for an open network.
  password: string | null;
  // Set for a network that never connects, to show that failure.
  failure?: string;
}

export const WIFI_NETWORKS: WifiNetwork[] = [
  { id: 'home', ssid: 'Demo Home', signal: 4, password: 'demo1234' },
  { id: 'cafe', ssid: 'Demo Cafe Guest', signal: 3, password: null },
  { id: 'garage', ssid: 'Demo Service Bay', signal: 2, password: 'service1' },
  {
    id: 'neighbour',
    ssid: 'Demo Far Away',
    signal: 1,
    password: 'faraway1',
    failure: 'The signal is too weak to connect',
  },
];

export const findWifiNetwork = (id: string): WifiNetwork | undefined =>
  WIFI_NETWORKS.find((network) => network.id === id);

export interface BluetoothDevice {
  id: string;
  name: string;
  kind: 'phone' | 'headphones' | 'tablet';
  // Can play through the car's speakers.
  hasMedia: boolean;
  // What the panel asks the driver to compare with the device.
  code: string;
  failure?: string;
}

export const BLUETOOTH_DEVICES: BluetoothDevice[] = [
  { id: 'phone', name: 'Demo Phone', kind: 'phone', hasMedia: true, code: '482913' },
  { id: 'tablet', name: 'Demo Tablet', kind: 'tablet', hasMedia: true, code: '205716' },
  { id: 'work-phone', name: 'Demo Work Phone', kind: 'phone', hasMedia: false, code: '667120' },
  {
    id: 'headphones',
    name: 'Demo Headphones',
    kind: 'headphones',
    hasMedia: true,
    code: '391048',
    failure: 'The device stopped responding',
  },
];

export const findBluetoothDevice = (id: string): BluetoothDevice | undefined =>
  BLUETOOTH_DEVICES.find((device) => device.id === id);

// The sample password for the car's own hotspot.
export const HOTSPOT_PASSWORD = 'demo-hotspot';
