import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { bootReducer, FALLBACK_MS, MIN_LOADING_MS, useBoot, type BootEvent } from './useBoot';

test.each<[string, BootEvent, string]>([
  ['loading', 'contentSettled', 'settling'],
  ['loading', 'settled', 'loading'],
  ['loading', 'timedOut', 'ready'],
  ['settling', 'contentSettled', 'settling'],
  ['settling', 'settled', 'ready'],
  ['settling', 'timedOut', 'ready'],
  ['ready', 'contentSettled', 'ready'],
])('%s + %s = %s', (status, event, expected) => {
  expect(bootReducer(status as 'loading', event)).toBe(expected);
});

describe('useBoot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('stays up for the minimum, then lifts once the car has settled', () => {
    const { result } = renderHook(() => useBoot());
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.onContentSettled());
    expect(result.current.isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(MIN_LOADING_MS);
    });
    expect(result.current.isLoading).toBe(false);
  });

  test('never waits past the fallback', () => {
    const { result } = renderHook(() => useBoot());

    act(() => {
      vi.advanceTimersByTime(FALLBACK_MS);
    });
    expect(result.current.isLoading).toBe(false);
  });
});
