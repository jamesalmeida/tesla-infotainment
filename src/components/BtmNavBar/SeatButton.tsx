import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { useCar, useCarActions } from '../../state/CarStateContext';
import {
  COOLED_SEATS,
  seatHeatLabel,
  type SeatHeat,
  type SeatId,
  type SeatLevel as Level,
} from '../../state/climate';
import { getImagePath } from '../../utils/assetPaths';
import { SeatLevel } from '../Climate/SeatLevel';
import styles from './SeatButton.module.css';

const LEVELS = [1, 2, 3] as const;

const SEAT_NAMES: Record<'driver' | 'passenger', string> = {
  driver: 'Driver seat',
  passenger: 'Passenger seat',
};

// The same seat icons as the app drawer's, which match the car's, with the drawer's level bars
// under them while the seat heats or cools.
function SeatGlyph({ side, heat }: { side: 'left' | 'right'; heat: SeatHeat }) {
  return (
    <span className={styles.glyph}>
      <img
        src={getImagePath(side === 'left' ? 'app-left-seat.svg' : 'app-right-seat.svg')}
        alt=""
      />
      {heat !== 0 && <SeatLevel heat={heat} />}
    </span>
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

  const choose = (next: Level) => setSeatLevel(seat, next);

  return (
    <div className={styles.seatControl} ref={ref}>
      <button
        type="button"
        className={`navIconWrapper ${styles.seatButton}`}
        aria-label={`${name} heat and cool, ${seatHeatLabel(heat)}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <SeatGlyph side={side} heat={heat} />
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
                  onClick={() => choose(-value as Level)}
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
