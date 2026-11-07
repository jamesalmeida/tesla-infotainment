import { useEffect, useRef } from 'react';
import { useNowPlaying } from '../../apps/mediaLibrary';
import {
  createRearChannel,
  isRearCommand,
  isRearMessage,
  postSnapshot,
  type RearSnapshot,
} from '../../apps/rearDisplay';
import { getMediaTransport } from '../../state/mediaTransport';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type { CarState } from '../../state/carState';

const snapshotOf = (state: CarState, media: ReturnType<typeof useNowPlaying>): RearSnapshot => ({
  climate: {
    seats: state.climate.seats,
    temperature: state.climate.isSplit ? state.climate.passengerTemp : state.climate.driverTemp,
    temperatureUnit: state.settings.preferences.temperature,
    isSplit: state.climate.isSplit,
    cabinOn: state.climate.cabin.isOn,
  },
  media: media.item
    ? { title: media.item.title, subtitle: media.item.subtitle, isPlaying: media.isPlaying }
    : null,
  updatedAt: Date.now(),
});

// Runs in the car window and keeps the rear window in step. It also applies the rear
// window's controls to the one real store, so both screens can't disagree.
export function RearSync() {
  const state = useCar((current) => current);
  const media = useNowPlaying();
  const { cycleSeat, stepTemperature } = useCarActions();
  const stateRef = useRef(state);
  const mediaRef = useRef(media);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Keep the latest values where the message handler can read them without re-subscribing.
  useEffect(() => {
    stateRef.current = state;
    mediaRef.current = media;
  }, [state, media]);

  useEffect(() => {
    const channel = createRearChannel();
    if (!channel) return;
    channelRef.current = channel;

    const publish = () => postSnapshot(channel, snapshotOf(stateRef.current, mediaRef.current));

    channel.onmessage = (event) => {
      const message = event.data;
      if (!isRearMessage(message) || message.type !== 'command') return;
      const command = message.command;
      if (!isRearCommand(command)) return;

      switch (command.type) {
        case 'request':
          publish();
          break;
        case 'seat':
          cycleSeat(command.seat, command.kind);
          break;
        case 'temperature':
          stepTemperature('passenger', command.delta);
          break;
        case 'media': {
          const transport = getMediaTransport();
          if (!transport) break;
          if (command.action === 'toggle') transport.togglePlayPause();
          else if (command.action === 'next') transport.next();
          else transport.previous();
          break;
        }
      }
    };

    publish();
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [cycleSeat, stepTemperature]);

  useEffect(() => {
    if (channelRef.current) postSnapshot(channelRef.current, snapshotOf(state, media));
  }, [state, media]);

  return null;
}
