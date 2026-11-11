// localStorage can throw on access in private windows and restricted contexts.
// Reads come back empty and writes are dropped, so storage can never take the app down.
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Full or unavailable: the setting just won't persist.
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
};
