import { useEffect, useRef } from 'react';
import { useCar, useCarActions, useGetCarState } from '../state/CarStateContext';
import { isCameraForced, isDemoId, type CarState } from '../state/carState';
import {
  CLOSED_HASH,
  hashToSurface,
  isRearHash,
  layerOf,
  sameSurface,
  surfaceToHash,
  type HistoryLayer,
} from '../state/urlState';

const entryLayer = (): HistoryLayer | null => {
  const layer: unknown = (window.history.state as { layer?: unknown } | null)?.layer;
  return layer === 0 || layer === 1 || layer === 2 ? layer : null;
};

const currentHash = () => {
  const { hash } = window.location;
  return hash === '' || hash === '#' ? CLOSED_HASH : hash;
};

const writeEntry = (method: 'pushState' | 'replaceState', hash: string, layer: HistoryLayer) => {
  const { pathname, search } = window.location;
  window.history[method]({ layer }, '', `${pathname}${search}${hash}`);
};

// Keeps the URL and the store in step, with the store deciding. Opening something adds one
// history entry and closing it steps back off that entry, so Back always undoes the last
// sheet instead of walking through every app or settings panel that was visited.
export function useUrlSync() {
  const surface = useCar((state) => state.surface);
  const activeModal = useCar((state) => state.activeModal);
  const isForced = useCar(isCameraForced);
  const { applyDemo, closeModal, restoreSurface } = useCarActions();
  const getState = useGetCarState();
  const hasBooted = useRef(false);
  // Set while our own step back is in flight, so its landing isn't taken for the user's Back.
  const isSteppingBack = useRef(false);

  useEffect(() => {
    const writeState = (state: CarState) => {
      // Reverse takes the screen without the user asking, so it leaves history alone. The URL
      // catches up when the camera lets go.
      if (isCameraForced(state)) return;
      const hash = surfaceToHash(state.surface);
      const layer = layerOf(state);
      const current = entryLayer() ?? 0;
      if (layer > current) {
        writeEntry('pushState', hash, layer);
      } else if (layer < current) {
        // One step at a time: a modal over the bare map has no entry for layer 1.
        isSteppingBack.current = true;
        window.history.back();
      } else if (currentHash() !== hash) {
        writeEntry('replaceState', hash, layer);
      }
    };

    const followUrl = () => {
      const target = hashToSurface(window.location.hash);
      if (target && !sameSurface(target, getState().surface)) restoreSurface(target);
      if ((entryLayer() ?? 0) < 2) closeModal();
    };

    const handlePopState = () => {
      if (isRearHash(window.location.hash)) {
        window.location.reload();
        return;
      }
      if (isSteppingBack.current) isSteppingBack.current = false;
      else followUrl();
      // A typed or linked hash arrives as a new entry that hasn't been given a layer.
      if (entryLayer() === null) writeEntry('replaceState', currentHash(), layerOf(getState()));
      writeState(getState());
    };

    if (!hasBooted.current) {
      hasBooted.current = true;
      const demo = new URLSearchParams(window.location.search).get('demo');
      if (demo && isDemoId(demo)) applyDemo(demo);

      const target = hashToSurface(window.location.hash);
      if (target && target.kind !== 'closed') restoreSurface(target);

      if (entryLayer() === null) {
        const state = getState();
        const opened = target && target.kind !== 'closed' && sameSurface(target, state.surface);
        // A link is the first entry in its tab, so Back would leave the site. Put the bare map
        // underneath it, which makes Back close the app like it does everywhere else.
        writeEntry('replaceState', opened ? CLOSED_HASH : currentHash(), 0);
        if (opened) writeEntry('pushState', surfaceToHash(state.surface), 1);
      }
    }

    writeState(getState());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surface, activeModal, isForced, applyDemo, closeModal, getState, restoreSurface]);
}
