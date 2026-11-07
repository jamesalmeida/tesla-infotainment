import { useEffect, useRef, useState } from 'react';
import {
  createRearChannel,
  isRearMessage,
  postCommand,
  type RearCommand,
  type RearSnapshot,
} from '../../apps/rearDisplay';
import { seatHeatLabel } from '../../state/climate';
import { formatTemperature } from '../../utils/units';
import styles from './RearDisplay.module.css';

const REAR_SEATS = ['rear-left', 'rear-center', 'rear-right'] as const;
const SEAT_LABELS = {
  'rear-left': 'Left',
  'rear-center': 'Centre',
  'rear-right': 'Right',
} as const;

export function RearDisplay() {
  const [snapshot, setSnapshot] = useState<RearSnapshot | null>(null);
  const [supported] = useState(() => typeof BroadcastChannel !== 'undefined');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = createRearChannel();
    if (!channel) return;
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const message = event.data;
      if (isRearMessage(message) && message.type === 'snapshot') setSnapshot(message.snapshot);
    };
    postCommand(channel, { type: 'request' });
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const send = (command: RearCommand) => {
    if (channelRef.current) postCommand(channelRef.current, command);
  };

  if (!supported) {
    return (
      <div className={styles.rear}>
        <p className={styles.empty}>This browser can&apos;t share state between windows.</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={styles.rear}>
        <p className={styles.empty}>Waiting for the car screen…</p>
        <p className={styles.note}>
          Open this from Settings → Display → Rear Display, with the car screen running.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.rear}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Rear passengers</p>
          <h1 className={styles.title}>Rear Display</h1>
        </div>
        <span className={styles.live}>Connected</span>
      </header>

      <p className={styles.note}>
        Demo only: this window mirrors the car screen and can change rear climate and media.
      </p>

      <section className={styles.section} aria-label="Rear climate">
        <h2>Climate</h2>
        <div className={styles.temperature}>
          <button
            type="button"
            className={styles.step}
            aria-label="Cooler"
            onClick={() => send({ type: 'temperature', delta: -1 })}
          >
            −
          </button>
          <strong>
            {formatTemperature(snapshot.climate.temperature, snapshot.climate.temperatureUnit)}
          </strong>
          <button
            type="button"
            className={styles.step}
            aria-label="Warmer"
            onClick={() => send({ type: 'temperature', delta: 1 })}
          >
            +
          </button>
        </div>
        <div className={styles.seats}>
          {REAR_SEATS.map((seat) => (
            <button
              key={seat}
              type="button"
              className={styles.seat}
              onClick={() => send({ type: 'seat', seat, kind: 'heat' })}
            >
              <span>{SEAT_LABELS[seat]}</span>
              <strong>{seatHeatLabel(snapshot.climate.seats[seat])}</strong>
            </button>
          ))}
        </div>
        {!snapshot.climate.cabinOn && <p className={styles.muted}>Climate is off.</p>}
      </section>

      <section className={styles.section} aria-label="Rear media">
        <h2>Media</h2>
        {snapshot.media ? (
          <>
            <p className={styles.mediaTitle}>{snapshot.media.title}</p>
            <p className={styles.muted}>{snapshot.media.subtitle}</p>
            <div className={styles.mediaButtons}>
              <button
                type="button"
                className={styles.mediaButton}
                onClick={() => send({ type: 'media', action: 'previous' })}
              >
                Previous
              </button>
              <button
                type="button"
                className={styles.mediaButton}
                onClick={() => send({ type: 'media', action: 'toggle' })}
              >
                {snapshot.media.isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                className={styles.mediaButton}
                onClick={() => send({ type: 'media', action: 'next' })}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className={styles.muted}>Nothing is playing.</p>
        )}
      </section>
    </div>
  );
}
