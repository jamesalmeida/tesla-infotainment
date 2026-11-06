// A running game owns the keyboard, so gear and signal shortcuts must not fire behind it.
let claims = 0;

export const claimKeyboard = () => {
  claims += 1;
};

export const releaseKeyboard = () => {
  claims = Math.max(0, claims - 1);
};

export const isKeyboardClaimed = () => claims > 0;
