import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { LOW_TIRE_PSI, TIRE_CORNERS, TIRE_CORNER_LABELS } from '../../state/carState';
import { RECOMMENDED_TIRE_PSI } from '../../state/sampleData';
import {
  formatDistanceFixed,
  formatTirePressure,
  toDisplayDistance,
  unitLabel,
} from '../../utils/units';
import { MusicPanel } from '../MusicPanel/MusicPanel';
import styles from './CarCards.module.css';

const CARDS = [
  { id: 'media', label: 'Media' },
  { id: 'tires', label: 'Tires' },
  { id: 'trip', label: 'Trip' },
] as const;

type CardId = (typeof CARDS)[number]['id'];

const SWIPE_THRESHOLD_PX = 40;
// A swipe is horizontal. A longer vertical move is someone scrolling the card.
const MAX_SWIPE_TRAVEL_PX = 60;

export const cardAfterSwipe = (index: number, deltaX: number, deltaY = 0): number => {
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaY) > MAX_SWIPE_TRAVEL_PX) return index;
  return Math.max(0, Math.min(CARDS.length - 1, index + (deltaX < 0 ? 1 : -1)));
};

const isInteractive = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(target.closest('button, input, textarea, select, a, [data-swipe-ignore]'));

function TireCard() {
  const pressures = useCar((state) => state.tirePressures);
  const unit = useCar((state) => state.settings.preferences.tirePressure);
  // Derived here rather than as a selector: a selector must return the same value each
  // time, and a fresh array would make the store re-render forever.
  const low = TIRE_CORNERS.filter((corner) => pressures[corner] < LOW_TIRE_PSI);

  return (
    <section className={styles.card} aria-label="Tire pressure">
      <div className={styles.cardHeading}>
        <h2 className={styles.cardTitle}>Tire Pressure</h2>
        <span className={styles.cardNote}>Simulated cold pressures</span>
      </div>
      <div className={styles.tireGrid}>
        {TIRE_CORNERS.map((corner) => (
          <div
            key={corner}
            className={`${styles.tireReading} ${low.includes(corner) ? styles.low : ''}`}
          >
            <span>{TIRE_CORNER_LABELS[corner]}</span>
            <strong>{formatTirePressure(pressures[corner], unit)}</strong>
          </div>
        ))}
      </div>
      {low.length > 0 ? (
        <p className={styles.warning} role="alert">
          Low pressure in {low.map((corner) => TIRE_CORNER_LABELS[corner]).join(', ')}. Recommended
          cold pressure is {formatTirePressure(RECOMMENDED_TIRE_PSI, unit)}.
        </p>
      ) : (
        <p className={styles.cardNote}>All four tires are at the recommended pressure.</p>
      )}
    </section>
  );
}

function TripCard() {
  const odometer = useCar((state) => state.odometerMiles);
  const tripMiles = useCar((state) => state.tripMiles);
  const energyUsed = useCar((state) => state.energyUsedKwh);
  const tripStart = useCar((state) => state.tripStartKwh);
  const battery = useCar((state) => state.batteryPercent);
  const preferences = useCar((state) => state.settings.preferences);
  const used = Math.max(0, energyUsed - tripStart);
  const displayMiles = toDisplayDistance(tripMiles, preferences.distance);
  const efficiency = displayMiles > 0.1 ? `${Math.round((used * 1000) / displayMiles)} Wh` : '—';

  return (
    <section className={styles.card} aria-label="Trip information">
      <div className={styles.cardHeading}>
        <h2 className={styles.cardTitle}>Trip Information</h2>
        <span className={styles.cardNote}>Simulated</span>
      </div>
      <div className={styles.tripGrid}>
        <div className={styles.tripReading}>
          <span>Current trip</span>
          <strong>{formatDistanceFixed(tripMiles, preferences.distance, 1)}</strong>
        </div>
        <div className={styles.tripReading}>
          <span>Energy used</span>
          <strong>{used.toFixed(1)} kWh</strong>
        </div>
        <div className={styles.tripReading}>
          <span>Efficiency</span>
          <strong>
            {efficiency}
            {efficiency !== '—' ? `/${unitLabel(preferences.distance)}` : ''}
          </strong>
        </div>
        <div className={styles.tripReading}>
          <span>Odometer</span>
          <strong>{formatDistanceFixed(odometer, preferences.distance, 0)}</strong>
        </div>
        <div className={styles.tripReading}>
          <span>Battery</span>
          <strong>{battery}%</strong>
        </div>
      </div>
    </section>
  );
}

// The cards under the car. Swiping is how the car does it; the dots underneath are also a
// tab list, so a tap or the arrow keys reach every card too.
export function CarCards() {
  const volume = useCar((state) => state.volume);
  const { openSettings } = useCarActions();
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // The frame takes the height of the card showing, not the tallest one, so a short card
  // doesn't leave an empty band under it. It follows the card as its contents change.
  useLayoutEffect(() => {
    const slide = trackRef.current?.children[index];
    if (!(slide instanceof HTMLElement)) return;
    const measure = () => setHeight(slide.offsetHeight || undefined);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [index]);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const card = CARDS[index];

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isInteractive(event.target)) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setDragX(event.clientX - dragStart.current.x);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    dragStart.current = null;
    setDragX(0);
    setIndex((current) => cardAfterSwipe(current, deltaX, deltaY));
  };

  const handleCancel = () => {
    dragStart.current = null;
    setDragX(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = index + (event.key === 'ArrowRight' ? 1 : -1);
    setIndex(Math.max(0, Math.min(CARDS.length - 1, next)));
  };

  const dragPercent = Math.max(-1, Math.min(1, dragX / 240));

  return (
    <div className={styles.deck}>
      <div
        className={styles.viewport}
        style={{ height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handleCancel}
      >
        <div
          ref={trackRef}
          className={styles.track}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dragPercent * 100}%))` }}
        >
          <div
            className={styles.slide}
            aria-hidden={card.id !== 'media'}
            inert={card.id !== 'media'}
          >
            <div className={styles.mediaCard}>
              <MusicPanel volume={volume} onOpenAudioSettings={() => openSettings('Audio')} />
            </div>
          </div>
          <div
            className={styles.slide}
            aria-hidden={card.id !== 'tires'}
            inert={card.id !== 'tires'}
          >
            <TireCard />
          </div>
          <div className={styles.slide} aria-hidden={card.id !== 'trip'} inert={card.id !== 'trip'}>
            <TripCard />
          </div>
        </div>
      </div>
      {/* Only the dots show, as on the car: swipe the card, or tap a dot to jump to it. */}
      <div
        className={styles.dots}
        role="tablist"
        aria-label="Cards under the car"
        onKeyDown={handleKeyDown}
      >
        {CARDS.map((option, optionIndex) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-label={option.label}
            aria-selected={option.id === card.id}
            tabIndex={option.id === card.id ? 0 : -1}
            className={option.id === card.id ? styles.activeDot : ''}
            onClick={() => setIndex(optionIndex)}
          />
        ))}
      </div>
    </div>
  );
}

export type { CardId };
