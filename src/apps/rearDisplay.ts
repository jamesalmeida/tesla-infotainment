import type { SeatHeat, SeatId, SeatKind } from '../state/climate';

// The rear screen is a second window. It talks to the car window through BroadcastChannel,
// so neither window reaches into the other's React store.
export const REAR_CHANNEL = 'tesla-rear-display';

export interface RearSnapshot {
  climate: {
    seats: Record<SeatId, SeatHeat>;
    temperature: number;
    temperatureUnit: 'F' | 'C';
    isSplit: boolean;
    cabinOn: boolean;
  };
  media: {
    title: string;
    subtitle: string;
    isPlaying: boolean;
  } | null;
  updatedAt: number;
}

export type RearCommand =
  | { type: 'request' }
  | { type: 'seat'; seat: SeatId; kind: SeatKind }
  | { type: 'temperature'; delta: number }
  | { type: 'media'; action: 'toggle' | 'next' | 'previous' };

export type RearMessage =
  { type: 'snapshot'; snapshot: RearSnapshot } | { type: 'command'; command: RearCommand };

export const isRearMessage = (value: unknown): value is RearMessage => {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as { type?: unknown };
  return message.type === 'snapshot' || message.type === 'command';
};

export const isRearCommand = (value: unknown): value is RearCommand => {
  if (typeof value !== 'object' || value === null) return false;
  const command = value as { type?: unknown };
  return (
    command.type === 'request' ||
    command.type === 'seat' ||
    command.type === 'temperature' ||
    command.type === 'media'
  );
};

export const createRearChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(REAR_CHANNEL);
};

export const postSnapshot = (channel: BroadcastChannel, snapshot: RearSnapshot) =>
  channel.postMessage({ type: 'snapshot', snapshot } satisfies RearMessage);

export const postCommand = (channel: BroadcastChannel, command: RearCommand) =>
  channel.postMessage({ type: 'command', command } satisfies RearMessage);

export const openRearWindow = () => {
  const url = `${import.meta.env.BASE_URL}#/rear`;
  window.open(url, 'tesla-rear-display', 'popup=yes,width=960,height=640');
};
