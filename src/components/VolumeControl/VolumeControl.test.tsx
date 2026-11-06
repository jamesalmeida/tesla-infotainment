import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import VolumeControl from './VolumeControl';

const modal = () => document.querySelector('.volume-modal');

const renderVolumeControl = () =>
  render(<VolumeControl volume={50} onVolumeChange={vi.fn()} onOpenAudioSettings={vi.fn()} />);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

test('the volume modal closes automatically after the timeout', () => {
  renderVolumeControl();

  fireEvent.click(screen.getByAltText('Volume'));
  expect(modal()).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(3300);
  });

  expect(modal()).not.toBeInTheDocument();
});

test('moving the mouse keeps the volume modal open', () => {
  renderVolumeControl();

  fireEvent.click(screen.getByAltText('Volume'));
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  const openModal = modal();
  if (!openModal) throw new Error('Volume modal did not open');
  fireEvent.mouseMove(openModal);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(modal()).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1500);
  });
  expect(modal()).not.toBeInTheDocument();
});

test('changing the volume repeatedly keeps the popup up without flicker', () => {
  renderVolumeControl();

  for (let click = 0; click < 12; click += 1) {
    fireEvent.click(screen.getByAltText('Increase volume'));
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(modal()).toBeInTheDocument();
  }
});

test('interacting during the fade cancels it', () => {
  renderVolumeControl();

  fireEvent.click(screen.getByAltText('Volume'));
  act(() => {
    vi.advanceTimersByTime(3100);
  });
  const fading = modal();
  if (!fading) throw new Error('Volume modal closed too early');
  expect(fading.className).toContain('fade-out');

  fireEvent.mouseMove(fading);
  expect(modal()?.className).not.toContain('fade-out');
  act(() => {
    vi.advanceTimersByTime(2900);
  });
  expect(modal()).toBeInTheDocument();
});

test('the speaker icon closes the popup', () => {
  renderVolumeControl();

  fireEvent.click(screen.getByAltText('Volume'));
  fireEvent.click(screen.getByAltText('Volume'));

  expect(modal()).not.toBeInTheDocument();
});

test('no timer survives unmounting', () => {
  const { unmount } = renderVolumeControl();

  fireEvent.click(screen.getByAltText('Volume'));
  unmount();

  expect(vi.getTimerCount()).toBe(0);
});
