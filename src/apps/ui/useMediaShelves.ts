import { useCallback, useEffect, useState } from 'react';
import { getMediaSource, type MediaShelf, type MediaSourceId } from '../mediaLibrary';

type Loaded =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; shelves: MediaShelf[] };

// Sample sources always work, but a real one won't, so the screens deal with both from day one.
export function useMediaShelves(sourceId: MediaSourceId) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    getMediaSource(sourceId)
      .browse()
      .then((shelves) => {
        if (isCurrent) setLoaded({ status: 'ready', shelves });
      })
      .catch(() => {
        if (isCurrent) setLoaded({ status: 'failed' });
      });
    return () => {
      isCurrent = false;
    };
  }, [sourceId, attempt]);

  const retry = useCallback(() => {
    setLoaded({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { loaded, retry };
}
