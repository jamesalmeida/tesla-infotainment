import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import VolumeControl from './VolumeControl';

const modal = () => document.querySelector('.volume-modal');

const renderVolumeControl = () =>
  render(
    <VolumeControl
      volume={50}
      onVolumeChange={vi.fn()}
      onOpenAudioSettings={vi.fn()}
    />
  );

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
  fireEvent.mouseMove(modal());
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(modal()).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1500);
  });
  expect(modal()).not.toBeInTheDocument();
});
