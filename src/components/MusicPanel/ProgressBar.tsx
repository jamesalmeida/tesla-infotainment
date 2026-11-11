import { memo, useState, type PointerEvent } from 'react';
import { seekPlayback, useNowPlayingValue } from '../../apps/mediaLibrary';
import styles from './MusicPanel.module.css';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

const fractionAt = (event: PointerEvent<HTMLDivElement>) => {
  const { left, width } = event.currentTarget.getBoundingClientRect();
  return width > 0 ? clampFraction((event.clientX - left) / width) : 0;
};

/**
 * The only part of the card that re-renders as audio plays. A drag moves the bar straight
 * away but seeks once, on release. Live radio has no position, so it has nothing to drag.
 */
export const ProgressBar = memo(function ProgressBar() {
  const position = useNowPlayingValue((now) => now.positionSeconds);
  const duration = useNowPlayingValue((now) => (now.item?.live ? 0 : (now.durationSeconds ?? 0)));
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const fraction = dragFraction ?? (duration > 0 ? clampFraction(position / duration) : 0);

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
    seekPlayback(fractionAt(event) * duration);
  };

  return (
    <div className={styles.musicProgressBar}>
      <div
        className={styles.progressHitArea}
        data-swipe-ignore=""
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
