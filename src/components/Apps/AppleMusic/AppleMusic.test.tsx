import { act, fireEvent, render, screen } from '@testing-library/react';
import { resetMediaLibrary, skip, togglePlayback, useNowPlaying } from '../../../apps/mediaLibrary';
import { AppleMusic } from './AppleMusic';

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

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

afterEach(() => {
  act(() => resetMediaLibrary());
});

test('browses sample albums, and plays one through the shared transport', async () => {
  const { container } = render(
    <>
      <AppleMusic />
      <NowPlayingProbe />
    </>,
  );

  fireEvent.click(await screen.findByRole('button', { name: /Glass Harbour/ }));
  fireEvent.click(screen.getByRole('button', { name: /Salt on the Dial/ }));

  const nowPlaying = screen.getByLabelText('now playing');
  expect(nowPlaying).toHaveTextContent('Salt on the Dial');
  act(() => skip(1));
  expect(nowPlaying).toHaveTextContent('Harbour Lights');
  act(() => togglePlayback());
  expect(nowPlaying).toHaveTextContent('paused');
  // No player of its own: the media card plays it.
  expect(screen.queryByRole('region', { name: 'Now playing' })).not.toBeInTheDocument();

  expect(container.querySelector('img')).toBeNull();
});

test('it says the library is a sample and uses no service branding', async () => {
  const { container } = render(<AppleMusic />);
  await screen.findByRole('button', { name: /Glass Harbour/ });

  expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
  expect(screen.getByText(/invented and have no audio/)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/apple/i);
});
