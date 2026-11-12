import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  getMediaSource,
  resetMediaLibrary,
  seekPlayback,
  setMediaSource,
  stopPlayback,
  useNowPlaying,
  type MediaSource,
} from '../../../apps/mediaLibrary';
import { Podcasts } from './Podcasts';

// The app has no player of its own: what it plays shows on the media card, which reads this.
function NowPlayingProbe() {
  const now = useNowPlaying();
  return (
    <output aria-label="now playing">
      {now.item?.title ?? ''} | {now.isPlaying ? 'playing' : 'paused'} |{' '}
      {Math.round(now.positionSeconds)}
    </output>
  );
}

const openFirstShow = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /The Long Way Home/ }));
};

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

afterEach(() => {
  act(() => resetMediaLibrary());
  vi.useRealTimers();
});

test('shows open to their episodes, and nothing is hotlinked', async () => {
  const { container } = render(<Podcasts />);
  await openFirstShow();

  expect(screen.getByRole('button', { name: /The Map That Lied/ })).toBeInTheDocument();
  expect(container.querySelector('img, audio')).toBeNull();
});

test('an episode keeps its place after leaving and coming back', async () => {
  const { unmount } = render(<Podcasts />);
  await openFirstShow();
  fireEvent.click(screen.getByRole('button', { name: /The Map That Lied/ }));
  act(() => seekPlayback(600));
  act(() => stopPlayback());
  unmount();

  render(
    <>
      <Podcasts />
      <NowPlayingProbe />
    </>,
  );
  await openFirstShow();

  // 31:00 long, stopped at 10:00.
  expect(screen.getByRole('button', { name: /The Map That Lied/ })).toHaveTextContent('21:00 left');
  fireEvent.click(screen.getByRole('button', { name: /The Map That Lied/ }));
  expect(screen.getByLabelText('now playing')).toHaveTextContent(/The Map That Lied .* 600$/);
});

test('a catalogue that fails shows a message and can retry', async () => {
  const original = getMediaSource('podcasts');
  const failing: MediaSource = { browse: () => Promise.reject(new Error('feed down')) };
  setMediaSource('podcasts', failing);
  render(<Podcasts />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be loaded/);

  setMediaSource('podcasts', original);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('button', { name: /The Long Way Home/ })).toBeInTheDocument();
});
