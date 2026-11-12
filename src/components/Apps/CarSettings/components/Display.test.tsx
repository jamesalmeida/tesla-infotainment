import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CarStateProvider } from '../../../../state/CarStateContext';
import { initialCarState } from '../../../../state/carState';
import { Display } from './Display';

const renderDisplay = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Display />
    </CarStateProvider>,
  );

const fullScreenRow = () => document.querySelector('[data-setting="full-screen"]') as HTMLElement;

afterEach(() => {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: undefined,
  });
});

test('Full Screen asks the browser for full screen', async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: request,
  });
  renderDisplay();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
  });

  expect(request).toHaveBeenCalledTimes(1);
  expect(fullScreenRow()).toHaveTextContent("Hides the browser's bars");
});

test('without element full screen, it explains Add to Home Screen', () => {
  renderDisplay();
  expect(fullScreenRow()).toHaveTextContent('Add to Home Screen');
});

test('a refused request falls back to the Home Screen advice', async () => {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: vi.fn().mockRejectedValue(new Error('not allowed')),
  });
  renderDisplay();
  expect(fullScreenRow()).not.toHaveTextContent('Add to Home Screen');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
  });

  expect(fullScreenRow()).toHaveTextContent('Add to Home Screen');
});

test('in full screen the button leaves it', async () => {
  const exit = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: document.documentElement,
  });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
  renderDisplay();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Exit Full Screen' }));
  });

  expect(exit).toHaveBeenCalledTimes(1);
});
