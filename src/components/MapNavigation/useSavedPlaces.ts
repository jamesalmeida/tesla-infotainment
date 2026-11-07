import { useEffect, useReducer, useRef } from 'react';
import { useCar } from '../../state/CarStateContext';
import {
  loadSavedPlaces,
  savedPlacesReducer,
  storeSavedPlaces,
  type SavedPlaces,
  type SavedPlacesAction,
} from './savedPlaces';

/** The active profile's saved places. They follow the profile and persist across visits. */
export function useSavedPlaces(): [SavedPlaces, (action: SavedPlacesAction) => void] {
  const profileId = useCar((state) => state.activeProfileId);
  const [saved, dispatch] = useReducer(savedPlacesReducer, profileId, loadSavedPlaces);
  // The places currently on screen and whose they are, so a profile switch can never
  // write one driver's places over another's.
  const ownerRef = useRef(profileId);

  useEffect(() => {
    if (ownerRef.current === profileId) {
      storeSavedPlaces(profileId, saved);
      return;
    }
    ownerRef.current = profileId;
    dispatch({ type: 'loaded', saved: loadSavedPlaces(profileId) });
  }, [profileId, saved]);

  return [saved, dispatch];
}
