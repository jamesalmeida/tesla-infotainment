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

export const VEHICLE_INFO = {
  model: 'Demo Long Range',
  vin: 'DEMO0SIMULATED000',
  battery: '75 kWh (simulated)',
};

export const WHEEL_OPTIONS = [
  { value: 'aero-18', label: '18" Aero' },
  { value: 'sport-19', label: '19" Sport' },
  { value: 'track-20', label: '20" Track' },
] as const;

export type WheelConfig = (typeof WHEEL_OPTIONS)[number]['value'];

// Recommended cold pressure and a fixed sample reading for each corner.
export const TIRE_PRESSURES = [
  { corner: 'Front Left', psi: 42 },
  { corner: 'Front Right', psi: 41 },
  { corner: 'Rear Left', psi: 42 },
  { corner: 'Rear Right', psi: 40 },
];

export const SERVICE_INTERVALS = [
  { item: 'Tire rotation', everyMiles: 6250 },
  { item: 'Cabin air filter', everyMiles: 20000 },
  { item: 'Brake fluid check', everyMiles: 25000 },
];

export const MANUAL_TOPICS = [
  {
    title: 'Getting moving',
    body: 'Pick a gear at the top of the car panel, then hold Go or the up arrow key to accelerate.',
  },
  {
    title: 'Charging',
    body: 'Plug in while parked. Charging stops at the limit you set, and the car will not shift until unplugged.',
  },
  {
    title: 'Sharing the car',
    body: 'Give each driver a profile, and use Valet Mode with a PIN when you hand over the keys.',
  },
];

// Numbered like software releases, but these are made up for the simulated update.
export const DEMO_UPDATES = { standard: '2026.44.1-demo', advanced: '2026.46.0-demo' } as const;

export const DEMO_UPGRADES = [
  { name: 'Heated Rear Seats', detail: 'Warm back seats on cold mornings.' },
  { name: 'Acceleration Boost', detail: 'A quicker launch from a standstill.' },
  { name: 'Assisted Driving Pack', detail: 'More help on the highway.' },
  { name: 'Connectivity Plus', detail: 'Live traffic and streaming away from Wifi.' },
];
