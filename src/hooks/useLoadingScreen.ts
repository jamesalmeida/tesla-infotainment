import { useEffect, useState, type RefObject } from 'react';

const POLL_MS = 100;
// Keep the loading animation up a little after the images arrive.
const SETTLE_MS = 3000;
// Never leave the loading screen up longer than this.
const FALLBACK_MS = 15000;

// True until every <img> inside contentRef has loaded.
export function useLoadingScreen(contentRef: RefObject<HTMLElement | null>): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkIfLoaded = () => {
      const images = contentRef.current ? [...contentRef.current.querySelectorAll('img')] : null;
      if (images?.every((img) => img.complete && img.naturalHeight !== 0)) {
        timer = setTimeout(() => setIsLoading(false), SETTLE_MS);
      } else {
        timer = setTimeout(checkIfLoaded, POLL_MS);
      }
    };

    checkIfLoaded();
    const fallbackTimer = setTimeout(() => setIsLoading(false), FALLBACK_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [contentRef]);

  return isLoading;
}
