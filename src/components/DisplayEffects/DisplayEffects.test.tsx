import { render } from '@testing-library/react';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import { DisplayEffects, resolveTheme } from './DisplayEffects';

test.each([
  ['light', false, 'light'],
  ['light', true, 'light'],
  ['dark', false, 'dark'],
  ['auto', false, 'light'],
  ['auto', true, 'dark'],
] as const)('%s with a dark OS of %s is %s', (appearance, isOsDark, theme) => {
  expect(resolveTheme(appearance, isOsDark)).toBe(theme);
});

test('the chosen appearance reaches the page, and blue light sets the tint', () => {
  const display = {
    ...initialCarState.display,
    appearance: 'dark' as const,
    blueLightReduction: 100,
  };
  render(
    <CarStateProvider initialState={{ ...initialCarState, display }}>
      <DisplayEffects />
    </CarStateProvider>,
  );
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.querySelector<HTMLElement>('.nightTint')?.style.opacity).toBe('0.35');
});
