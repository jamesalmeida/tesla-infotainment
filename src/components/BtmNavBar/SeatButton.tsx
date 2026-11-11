import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { COOLED_SEATS, seatHeatLabel, type SeatId, type SeatLevel } from '../../state/climate';
import styles from './SeatButton.module.css';

const LEVELS = [1, 2, 3] as const;

const SEAT_NAMES: Record<'driver' | 'passenger', string> = {
  driver: 'Driver seat',
  passenger: 'Passenger seat',
};

// A seat in profile, facing the way the seat does, with heat or cool lines above it.
function SeatGlyph({ side, level }: { side: 'left' | 'right'; level: number }) {
  const lines = Math.abs(level);
  return (
    <svg
      className={styles.glyph}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={side === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        className={styles.seat}
        d="M9 6c2 0 3 1 3.4 3l2 9.6h7.6a2.5 2.5 0 0 1 0 5H12.4a2 2 0 0 1-2-1.6L7.3 9.6C7 7.6 7.6 6 9 6Z"
      />
      <path className={styles.seat} d="M14 24v3M21 24v3" />
      {Array.from({ length: lines }, (_, index) => (
        <path
          key={index}
          className={level > 0 ? styles.heat : styles.cool}
          d={`M${18 + index * 4} 4c-1.4 1.6 1.4 3.2 0 4.8s1.4 3.2 0 4.8`}
        />
      ))}
    </svg>
  );
}

// The seat beside each temperature, as in the car: a tap opens heat and cool, each at three
// levels. Seats without ventilation only offer heat.
export function SeatButton({
  seat,
  side,
}: {
  seat: 'driver' | 'passenger';
  side: 'left' | 'right';
}) {
  const heat = useCar((state) => state.climate.seats[seat]);
  const { setSeatLevel } = useCarActions();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(ref, isOpen, close);

  const level = heat === 'auto' ? 0 : heat;
  const canCool = COOLED_SEATS.includes(seat as SeatId);
  const name = SEAT_NAMES[seat];

  const choose = (next: SeatLevel) => setSeatLevel(seat, next);

  return (
    <div className={styles.seatControl} ref={ref}>
      <button
        type="button"
        className={`navIconWrapper ${styles.seatButton}`}
        aria-label={`${name} heat and cool, ${seatHeatLabel(heat)}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <SeatGlyph side={side} level={level} />
      </button>
      {isOpen && (
        <div className={styles.popover} role="group" aria-label={`${name} heating and cooling`}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Heat</span>
            <button
              type="button"
              aria-pressed={level === 0}
              onClick={() => choose(0)}
              className={styles.option}
            >
              Off
            </button>
            {LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Heat ${value}`}
                aria-pressed={level === value}
                className={`${styles.option} ${styles.heatOption}`}
                onClick={() => choose(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {canCool && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Cool</span>
              <button
                type="button"
                aria-pressed={level === 0}
                onClick={() => choose(0)}
                className={styles.option}
              >
                Off
              </button>
              {LEVELS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Cool ${value}`}
                  aria-pressed={level === -value}
                  className={`${styles.option} ${styles.coolOption}`}
                  onClick={() => choose(-value as SeatLevel)}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
