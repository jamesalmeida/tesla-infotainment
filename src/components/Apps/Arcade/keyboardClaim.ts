// Lets a running game tell the app's shortcut handling to leave the keyboard alone.
// A counter rather than a flag, so overlapping claims (React StrictMode remounts) stay balanced.
let claims = 0;

export const claimKeyboard = (): void => {
  claims += 1;
};

export const releaseKeyboard = (): void => {
  claims = Math.max(0, claims - 1);
};

export const isKeyboardClaimed = (): boolean => claims > 0;
