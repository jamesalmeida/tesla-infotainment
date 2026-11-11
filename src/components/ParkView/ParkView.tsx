import { useRef, type PointerEvent } from 'react';
import { navigateToPlace } from '../../apps/navigation';
import { loadSavedPlaces } from '../MapNavigation/savedPlaces';
import { useCar, useCarActions } from '../../state/CarStateContext';
import styles from './ParkView.module.css';

// How far the car panel must be dragged back before the map returns.
export const PARK_VIEW_EXIT_DRAG_PX = 40;
// Anything shorter than this is a tap, which also brings the map back.
const TAP_SLOP_PX = 6;

export const shouldLeaveParkView = (deltaX: number): boolean =>
  deltaX <= -PARK_VIEW_EXIT_DRAG_PX || Math.abs(deltaX) <= TAP_SLOP_PX;

// The edge of the full-width car panel. Dragging it back towards the middle, or tapping it,
// returns to the split with the map.
export function ParkViewHandle({ onExit }: { onExit: () => void }) {
  const startX = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return;
    const deltaX = event.clientX - startX.current;
    startX.current = null;
    if (shouldLeaveParkView(deltaX)) onExit();
  };

  return (
    <button
      type="button"
      className={styles.handle}
      aria-label="Show the map"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        startX.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExit();
        }
      }}
    />
  );
}

// The faded corner of map that shows through. Tapping it brings the whole map back.
export function ParkViewMapCorner({ onExit }: { onExit: () => void }) {
  return (
    <button type="button" className={styles.mapCorner} aria-label="Open the map" onClick={onExit} />
  );
}

// Sits beside the media card in Park view, like the car's own. Each choice returns to the map
// with the search ready, since that's where a trip is set up.
export function ParkNavCard({ onExit }: { onExit: () => void }) {
  const profileId = useCar((state) => state.activeProfileId);
  const { closeSurface, showNotice } = useCarActions();

  const searchFor = (place: string) => {
    onExit();
    // The map needs a frame to come back before its search box can take focus.
    requestAnimationFrame(() => navigateToPlace(place, { closeSurface, showNotice }));
  };

  const openSearch = () => {
    onExit();
    requestAnimationFrame(() => document.getElementById('navigateTo')?.focus());
  };

  const goTo = (slot: 'home' | 'work') => {
    const place = loadSavedPlaces(profileId)[slot];
    if (place) {
      searchFor(place.name);
    } else {
      openSearch();
      showNotice(`Set ${slot === 'home' ? 'Home' : 'Work'} from the map search first`);
    }
  };

  return (
    <section className={styles.navCard} aria-label="Navigation">
      <button type="button" className={styles.search} onClick={openSearch}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" />
        </svg>
        Navigate
      </button>
      <div className={styles.shortcuts}>
        <button type="button" onClick={() => goTo('home')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" />
          </svg>
          Home
        </button>
        <button type="button" onClick={() => goTo('work')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" />
          </svg>
          Work
        </button>
      </div>
    </section>
  );
}
