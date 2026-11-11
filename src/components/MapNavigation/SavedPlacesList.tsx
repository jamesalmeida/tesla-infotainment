import type { Place } from './place';
import { isFavorite, placeKey, type SavedPlaces } from './savedPlaces';
import styles from './PlaceSearch.module.css';

export interface SavedPlacesActions {
  onToggleFavorite: (place: Place) => void;
  onRemoveRecent: (place: Place) => void;
}

interface SavedPlacesListProps {
  saved: SavedPlaces;
  actions: SavedPlacesActions;
  onPick: (place: Place) => void;
}

// mousedown, not click, on everything here: the search box's blur would close the list first.
const onPress = (action: () => void) => ({
  onMouseDown: (e: React.MouseEvent) => {
    e.preventDefault();
    action();
  },
  // A keyboard press arrives as a click with no mousedown before it.
  onClick: (e: React.MouseEvent) => {
    if (e.detail === 0) action();
  },
});

function Star({
  place,
  saved,
  actions,
}: Pick<SavedPlacesListProps, 'saved' | 'actions'> & {
  place: Place;
}) {
  const on = isFavorite(saved, place);
  return (
    <button
      type="button"
      className={styles.savedAction}
      aria-label={`Favorite ${place.name}`}
      aria-pressed={on}
      {...onPress(() => actions.onToggleFavorite(place))}
    >
      {on ? '★' : '☆'}
    </button>
  );
}

function ShortcutRow({
  label,
  place,
  onPick,
}: {
  label: string;
  place: Place | null;
  onPick: (place: Place) => void;
}) {
  return (
    <li className={styles.savedRow}>
      <button
        type="button"
        className={styles.savedPick}
        disabled={!place}
        {...(place ? onPress(() => onPick(place)) : {})}
      >
        <span className={styles.savedLabel}>{label}</span>{' '}
        <span className={styles.savedHint}>
          {place ? place.name : 'Search for a place to set it'}
        </span>
      </button>
    </li>
  );
}

/** Home, Work, Favorites and Recents, offered before anything has been typed. */
export function SavedPlacesList({ saved, actions, onPick }: SavedPlacesListProps) {
  const pick = (place: Place) => (
    <button type="button" className={styles.savedPick} {...onPress(() => onPick(place))}>
      {place.name}
    </button>
  );

  return (
    <ul className={styles.savedPlaces} aria-label="Saved places">
      <ShortcutRow label="Home" place={saved.home} onPick={onPick} />
      <ShortcutRow label="Work" place={saved.work} onPick={onPick} />
      {saved.favorites.length > 0 && <li className={styles.savedHeading}>Favorites</li>}
      {saved.favorites.map((place) => (
        <li key={placeKey(place)} className={styles.savedRow}>
          {pick(place)}
          <Star place={place} saved={saved} actions={actions} />
        </li>
      ))}
      {saved.recents.length > 0 && <li className={styles.savedHeading}>Recent</li>}
      {saved.recents.map((place) => (
        <li key={placeKey(place)} className={styles.savedRow}>
          {pick(place)}
          <Star place={place} saved={saved} actions={actions} />
          <button
            type="button"
            className={styles.savedAction}
            aria-label={`Remove ${place.name} from recents`}
            {...onPress(() => actions.onRemoveRecent(place))}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
