export type MapsFailure = 'missingKey' | 'authFailed' | 'loadFailed';

// What .env.template ships with. Sending it to Google could only ever fail.
const TEMPLATE_KEY = 'YOUR_API_KEY_HERE';

/** The key to load Google Maps with, or null if it isn't worth trying. */
export function usableMapsKey(key: string | undefined): string | null {
  const trimmed = key?.trim();
  return trimmed && trimmed !== TEMPLATE_KEY ? trimmed : null;
}

interface FailureCopy {
  title: string;
  detail: string;
}

const DEPLOYED_COPY: FailureCopy = {
  title: 'Maps are unavailable',
  detail: 'Search and navigation are turned off for now. Everything else in the car still works.',
};

const DEVELOPMENT_COPY: Record<MapsFailure, FailureCopy> = {
  missingKey: {
    title: 'Add a Google Maps key',
    detail:
      'Copy .env.template to .env, set VITE_GOOGLE_MAPS_API_KEY, and restart the dev server. Everything else in the car works without it.',
  },
  authFailed: {
    title: 'Google rejected the Maps key',
    detail:
      'Check VITE_GOOGLE_MAPS_API_KEY in .env, and that the key allows this address and the Maps JavaScript, Places and Routes APIs.',
  },
  loadFailed: {
    title: "Google Maps didn't load",
    detail: 'Check your connection, then reload the page.',
  },
};

/** Setup advice is for developers. Anyone on the deployed site can't act on it. */
export function describeMapsFailure(failure: MapsFailure, isDevelopment: boolean): FailureCopy {
  return isDevelopment ? DEVELOPMENT_COPY[failure] : DEPLOYED_COPY;
}
