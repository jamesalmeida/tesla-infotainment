import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  connectPlayback,
  resetMediaLibrary,
  type PlaybackEngine,
} from '../../../apps/mediaLibrary';
import { APPS } from '../../../apps/registry';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import { Radio } from './Radio';
import {
  DIRECTORY_HOSTS,
  directoryPath,
  fetchStations,
  loadFavourites,
  toggleFavourite,
  toMediaItem,
  toStations,
  type Station,
} from './stations';
import { AudiobooksPlaceholder, MusicStreamingPlaceholder } from './StreamingPlaceholder';

const raw = (id: string, overrides = {}) => ({
  stationuuid: id,
  name: `Station ${id}`,
  url_resolved: `https://stream.example/${id}.mp3`,
  favicon: 'https://logo.example/x.png',
  country: 'Nowhere',
  tags: 'jazz,calm,late,extra',
  hls: 0,
  lastcheckok: 1,
  ...overrides,
});

const station: Station = {
  id: 'a',
  name: 'Station a',
  url: 'https://stream.example/a.mp3',
  place: 'Nowhere',
  tags: 'jazz',
};

const respondWith = (body: unknown) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body))));

const renderRadio = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Radio />
    </CarStateProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('directory', () => {
  test('asks for secure, working stations', () => {
    const path = directoryPath({ tag: 'Jazz' });
    expect(path).toContain('is_https=true');
    expect(path).toContain('hidebroken=true');
    expect(path).toContain('tag=jazz');
    expect(directoryPath({ name: 'a b' })).toContain('name=a+b');
  });

  test('drops anything a secure page cannot play, and never keeps a logo', () => {
    const stations = toStations([
      raw('good'),
      raw('insecure', { url_resolved: 'http://stream.example/a.mp3' }),
      raw('playlist', { url_resolved: 'https://stream.example/live.m3u8' }),
      raw('hls', { hls: 1 }),
      raw('dead', { lastcheckok: 0 }),
      raw('nameless', { name: '  ' }),
      null,
    ]);

    expect(stations.map((item) => item.id)).toEqual(['good']);
    expect(stations[0].tags).toBe('jazz, calm, late');
    expect(JSON.stringify(stations)).not.toContain('logo.example');
  });

  test('a garbled response gives no stations rather than an error', () => {
    expect(toStations({ error: 'nope' })).toEqual([]);
  });

  test('falls through to the next mirror, and throws only when all fail', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(new Response(JSON.stringify([raw('good')])));
    await expect(fetchStations({}, fetcher)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);

    const failing = vi.fn<typeof fetch>().mockRejectedValue(new Error('down'));
    await expect(fetchStations({}, failing)).rejects.toThrow('down');
    expect(failing).toHaveBeenCalledTimes(DIRECTORY_HOSTS.length);
  });

  test('a station plays as a live stream', () => {
    expect(toMediaItem(station)).toMatchObject({
      durationSeconds: null,
      streamUrl: station.url,
    });
  });

  test('favourites toggle', () => {
    const added = toggleFavourite([], station);
    expect(added).toEqual([station]);
    expect(toggleFavourite(added, station)).toEqual([]);
  });
});

describe('screen', () => {
  test('being offline shows a visible message that can be retried', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetcher);
    renderRadio();

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be reached/);

    vi.stubGlobal('fetch', respondWith([raw('good')]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /^Station good/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('choosing a station plays it through the media library', async () => {
    vi.stubGlobal('fetch', respondWith([raw('good')]));
    const engine: PlaybackEngine = {
      play: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      seek: vi.fn(),
      stop: vi.fn(),
      setVolume: vi.fn(),
      loadedId: vi.fn(() => null),
    };
    connectPlayback(() => engine);
    renderRadio();

    fireEvent.click(await screen.findByRole('button', { name: /^Station good/ }));

    expect(engine.play).toHaveBeenCalledTimes(1);
    expect(vi.mocked(engine.play).mock.calls[0][0].streamUrl).toContain('good.mp3');
    expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument();
    act(() => resetMediaLibrary());
  });

  test('favourites survive leaving the app', async () => {
    vi.stubGlobal('fetch', respondWith([raw('good')]));
    const { unmount } = renderRadio();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Station good to favourites' }));
    expect(loadFavourites()).toHaveLength(1);
    unmount();

    renderRadio();
    fireEvent.click(screen.getByRole('tab', { name: 'Favourites' }));
    expect(screen.getByRole('button', { name: /^Station good/ })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  test('a genre narrows the search', async () => {
    const fetcher = respondWith([raw('good')]);
    vi.stubGlobal('fetch', fetcher);
    renderRadio();
    await screen.findByRole('button', { name: /^Station good/ });

    fireEvent.click(screen.getByRole('button', { name: 'Jazz' }));

    await waitFor(() =>
      expect(fetcher.mock.lastCall as unknown as [string]).toEqual([
        expect.stringContaining('tag=jazz'),
        expect.anything(),
      ]),
    );
  });
});

describe('streaming placeholders', () => {
  const NAMES = /spotify|tidal|youtube|amazon|audible/i;

  test.each([
    ['music', MusicStreamingPlaceholder],
    ['audiobooks', AudiobooksPlaceholder],
  ])('the %s screen names no service and offers no login', (_, Screen) => {
    const { container } = render(
      <CarStateProvider initialState={initialCarState}>
        <Screen />
      </CarStateProvider>,
    );

    expect(container.textContent).not.toMatch(NAMES);
    expect(container.textContent).toMatch(/placeholder/);
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  test('every streaming shelf icon now opens an app', () => {
    ['spotify', 'tidal', 'youtube-music', 'amazon-music', 'audible', 'radio'].forEach((id) =>
      expect(Object.keys(APPS)).toContain(id),
    );
  });
});
