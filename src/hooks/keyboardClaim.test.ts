import { claimKeyboard, isKeyboardClaimed, releaseKeyboard } from './keyboardClaim';

test('the keyboard is claimed until every claim is released', () => {
  expect(isKeyboardClaimed()).toBe(false);

  claimKeyboard();
  claimKeyboard();
  releaseKeyboard();
  expect(isKeyboardClaimed()).toBe(true);

  releaseKeyboard();
  expect(isKeyboardClaimed()).toBe(false);
});

test('an unmatched release does not cancel the next claim', () => {
  releaseKeyboard();
  claimKeyboard();
  expect(isKeyboardClaimed()).toBe(true);
  releaseKeyboard();
});
