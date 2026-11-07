import type { Place } from './place';
import { isFavorite, isSamePlace, type SavedPlaces, type SavedPlacesAction } from './savedPlaces';
import styles from './MapNavigation.module.css';

interface PlaceActionsProps {
  place: Place;
  saved: SavedPlaces;
  dispatch: (action: SavedPlacesAction) => void;
}

/** Saves the place on screen: a star for Favorites, or as Home or Work. */
export function PlaceActions({ place, saved, dispatch }: PlaceActionsProps) {
  const isHome = isSamePlace(saved.home, place);
  const isWork = isSamePlace(saved.work, place);
  const favorite = isFavorite(saved, place);

  return (
    <div className={styles.placeActions}>
      <button
        className={styles.placeAction}
        aria-label="Favorite"
        aria-pressed={favorite}
        onClick={() => dispatch({ type: 'favoriteToggled', place })}
      >
        {favorite ? '★' : '☆'} Favorite
      </button>
      <button
        className={styles.placeAction}
        aria-pressed={isHome}
        onClick={() => dispatch({ type: 'homeSet', place: isHome ? null : place })}
      >
        Home
      </button>
      <button
        className={styles.placeAction}
        aria-pressed={isWork}
        onClick={() => dispatch({ type: 'workSet', place: isWork ? null : place })}
      >
        Work
      </button>
    </div>
  );
}
