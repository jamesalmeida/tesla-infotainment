import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FullscreenPrompt, shouldPromptFullscreen } from './FullscreenPrompt';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

const setTouch = (points: number) => {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: points });
};

beforeEach(() => {
  localStorage.clear();
  setTouch(5);
  setViewport(402, 714);
});

afterEach(() => {
  vi.restoreAllMocks();
  setTouch(0);
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: undefined,
  });
});

describe('when to offer full screen', () => {
  const base = {
    isTouch: true,
    isStandalone: false,
    isFullscreen: false,
    dismissed: false,
    width: 402,
    height: 714,
  };

  test('a small touch screen gets the hint', () => {
    expect(shouldPromptFullscreen(base)).toBe(true);
    expect(shouldPromptFullscreen({ ...base, width: 951, height: 589 })).toBe(true);
  });

  test.each([
    ['a desktop', { isTouch: false }],
    ['an installed app', { isStandalone: true }],
    ['a window already full screen', { isFullscreen: true }],
    ['a dismissed hint', { dismissed: true }],
    ['a large tablet', { width: 1366, height: 1024 }],
  ] as const)('%s gets no hint', (_name, override) => {
    expect(shouldPromptFullscreen({ ...base, ...override })).toBe(false);
  });
});

describe('the hint itself', () => {
  test('offers Home Screen when the browser has no element full screen', async () => {
    render(<FullscreenPrompt />);

    expect(await screen.findByRole('note')).toHaveTextContent('Add to Home Screen');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));

    expect(screen.queryByRole('note')).toBeNull();
    expect(localStorage.getItem('tesla-fullscreen-dismissed')).toBe('1');
  });

  test('stays hidden once dismissed', () => {
    localStorage.setItem('tesla-fullscreen-dismissed', '1');
    render(<FullscreenPrompt />);
    expect(screen.queryByRole('note')).toBeNull();
  });

  test('asks the browser for full screen when it supports it', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: request,
    });

    render(<FullscreenPrompt />);
    fireEvent.click(await screen.findByRole('button', { name: 'Full screen' }));

    expect(request).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('note')).toBeNull());
    expect(localStorage.getItem('tesla-fullscreen-dismissed')).toBe('1');
  });
});
