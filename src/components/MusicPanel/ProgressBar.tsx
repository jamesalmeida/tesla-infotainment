import { memo, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { clampFraction, progressFraction, type TimelineStore } from './playback';
import styles from './MusicPanel.module.css';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const fractionAt = (event: PointerEvent<HTMLDivElement>) => {
  const { left, width } = event.currentTarget.getBoundingClientRect();
  return width > 0 ? clampFraction((event.clientX - left) / width) : 0;
};

interface ProgressBarProps {
  timeline: TimelineStore;
  onSeek: (time: number) => void;
}

/**
 * The only part of the panel that re-renders on `timeupdate`. A drag moves the
 * bar straight away but seeks once, on release, rather than on every move.
 */
export const ProgressBar = memo(function ProgressBar({ timeline, onSeek }: ProgressBarProps) {
  const time = useSyncExternalStore(timeline.subscribe, timeline.getSnapshot);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const { position, duration } = time;
  const fraction = dragFraction ?? progressFraction(time);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (duration === 0 || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragFraction(fractionAt(event));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragFraction !== null) setDragFraction(fractionAt(event));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragFraction === null) return;
    setDragFraction(null);
    onSeek(fractionAt(event) * duration);
  };

  return (
    <div className={styles.musicProgressBar}>
      <div
        className={styles.progressHitArea}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragFraction(null)}
      >
        <div className={styles.progressBackground}>
          <div className={styles.progressForeground} style={{ width: `${fraction * 100}%` }}>
            <div className={`${styles.progressIndicator} ctaBtn`}></div>
          </div>
        </div>
      </div>
      <div className={styles.timeCode}>
        {formatTime(position)} / {formatTime(duration)}
      </div>
    </div>
  );
});
