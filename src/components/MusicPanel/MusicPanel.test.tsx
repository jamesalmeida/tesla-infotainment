import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  playItem,
  resetMediaLibrary,
  setPlaybackVolume,
  useNowPlaying,
  type MediaItem,
} from '../../apps/mediaLibrary';
import { getMediaTransport } from '../../state/mediaTransport';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { activeApp, initialCarState } from '../../state/carState';
import { MusicPanel } from './MusicPanel';

/**
 * Stands in for the element, following the parts of the HTML media spec this
 * panel depends on: loading resets the position and rejects pending play()
 * calls without firing `pause`, and reaching the end fires `pause` then `ended`.
 */
class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];

  preload = '';
  volume = 1;
  paused = true;
  ended = false;
  error: { code: number } | null = null;
  duration = NaN;
  srcHistory: string[] = [];
  seeks: number[] = [];
  loadCalls = 0;
  playCalls = 0;
  /** Set to make the next play() reject with this. */
  rejectPlayWith: unknown = null;

  private position = 0;
  private currentSrc = '';
  private rejectPending: ((reason: unknown) => void) | null = null;

  constructor() {
    super();
    FakeAudio.instances.push(this);
  }

  get src() {
    return this.currentSrc;
  }
  set src(url: string) {
    this.currentSrc = url;
    this.srcHistory.push(url);
    this.reset();
  }

  get currentTime() {
    return this.position;
  }
  set currentTime(time: number) {
    this.position = time;
    this.seeks.push(time);
  }

  removeAttribute(name: string) {
    if (name === 'src') this.currentSrc = '';
  }

  load() {
    this.loadCalls += 1;
    this.reset();
  }

  play() {
    this.playCalls += 1;
    if (this.rejectPlayWith) {
      const reason = this.rejectPlayWith;
      this.rejectPlayWith = null;
      return Promise.reject(reason);
    }
    this.paused = false;
    this.ended = false;
    return new Promise<void>((_, reject) => {
      this.rejectPending = reject;
    });
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.rejectPending?.(new DOMException('Interrupted by pause', 'AbortError'));
    this.dispatchEvent(new Event('pause'));
  }

  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }

  /** Moves playback along by itself, as a playing element does. */
  advanceTo(position: number, duration = this.duration) {
    this.position = position;
    this.duration = duration;
    this.emit('durationchange');
    this.emit('timeupdate');
  }

  reachEnd() {
    this.position = this.duration;
    this.paused = true;
    this.ended = true;
    this.emit('pause');
    this.emit('ended');
  }

  private reset() {
    this.position = 0;
    this.duration = NaN;
    this.ended = false;
    this.error = null;
    if (!this.paused) {
      this.paused = true;
      this.rejectPending?.(new DOMException('Interrupted by load', 'AbortError'));
    }
  }
}

const audio = () => {
  const [element] = FakeAudio.instances;
  if (!element) throw new Error('No audio element was created');
  return element;
};

const inAct = (run: () => void) => act(async () => run());
const clickButton = (alt: string) => inAct(() => fireEvent.click(screen.getByAltText(alt)));
const pressPlay = async () => {
  await clickButton('Play');
  await inAct(() => audio().emit('playing'));
};
const cardTitle = () => document.querySelector('.title')?.textContent;
const barWidth = () => document.querySelector<HTMLElement>('.progressForeground')?.style.width;
const hitArea = () => {
  const element = document.querySelector<HTMLElement>('.progressHitArea');
  if (!element) throw new Error('No progress bar');
  return element;
};

// The three featured episodes, in order. Math.random() is pinned so the first is cued.
const FEATURED = ['lex_ai_pieter_levels', 'lex_ai_elon_musk', 'PDP5840775995'];

const station: MediaItem = {
  id: 'radio-kexp',
  title: 'KEXP',
  subtitle: 'Seattle',
  collectionId: 'radio-kexp',
  durationSeconds: null,
  live: true,
  streamUrl: 'https://example.com/kexp.mp3',
  sourceId: 'radio',
};

function NowPlayingTitle() {
  return <output aria-label="now playing">{useNowPlaying().item?.title}</output>;
}

function OpenApp() {
  return <output aria-label="open app">{useCar(activeApp) ?? 'none'}</output>;
}

const renderCard = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <MusicPanel />
      <NowPlayingTitle />
      <OpenApp />
    </CarStateProvider>,
  );

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  localStorage.clear();
  resetMediaLibrary({ cue: true });
  Element.prototype.setPointerCapture = vi.fn();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    width: 200,
  } as DOMRect);
});

afterEach(() => {
  resetMediaLibrary();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('one player for everything', () => {
  it('shows a featured episode from the start, and downloads nothing until play', () => {
    renderCard();
    expect(cardTitle()).toMatch(/Pieter Levels/);
    expect(screen.getByText('Lex Fridman Podcast')).toBeInTheDocument();
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it('keeps to one audio element across sources, renders and a StrictMode remount', async () => {
    render(
      <StrictMode>
        <CarStateProvider initialState={initialCarState}>
          <MusicPanel />
        </CarStateProvider>
      </StrictMode>,
    );
    await pressPlay();
    await clickButton('Next Track');
    await inAct(() => playItem(station, [station]));

    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio().preload).toBe('none');
    expect(audio().src).toBe(station.streamUrl);
  });

  it('a station started in Radio becomes what the card shows and controls', async () => {
    renderCard();
    await inAct(() => playItem(station, [station]));
    await inAct(() => audio().emit('playing'));

    expect(cardTitle()).toBe('KEXP');
    expect(screen.getByRole('img', { name: 'Radio' })).toBeInTheDocument();
    expect(screen.getByAltText('Pause')).toBeInTheDocument();

    await clickButton('Pause');
    expect(audio().paused).toBe(true);
    expect(screen.getByAltText('Play')).toBeInTheDocument();
  });

  it('follows the car volume', async () => {
    renderCard();
    setPlaybackVolume(30);
    await pressPlay();
    expect(audio().volume).toBeCloseTo(0.3);
  });

  it('lets shortcuts, voice and the rear display drive it', async () => {
    renderCard();
    const transport = getMediaTransport();
    if (!transport) throw new Error('The player did not register its transport');

    await inAct(() => transport.togglePlayPause());
    expect(audio().playCalls).toBe(1);
    await inAct(() => transport.next());
    expect(screen.getByLabelText('now playing')).toHaveTextContent(/Elon Musk/);
  });
});

describe('playback follows the audio (#47)', () => {
  it('starts the next episode at 0 when Next is pressed mid-way', async () => {
    renderCard();
    await pressPlay();
    await inAct(() => audio().advanceTo(15.8, 600));
    await clickButton('Next Track');

    expect(audio().src).toContain(FEATURED[1]);
    expect(audio().currentTime).toBe(0);
  });

  it('advances and keeps playing when an episode finishes', async () => {
    renderCard();
    await pressPlay();
    await inAct(() => audio().advanceTo(599, 600));
    await inAct(() => audio().reachEnd());

    expect(audio().src).toContain(FEATURED[1]);
    expect(audio().playCalls).toBe(2);
  });

  it('shows the play icon and an error when play() is rejected', async () => {
    renderCard();
    await clickButton('Play');
    audio().rejectPlayWith = new DOMException('Blocked', 'NotAllowedError');
    await clickButton('Pause');
    await clickButton('Play');

    expect(await screen.findByRole('alert')).toHaveTextContent('Playback was blocked');
    expect(screen.getByAltText('Play')).toBeInTheDocument();
  });

  it('does not reload the file on pause and resume', async () => {
    renderCard();
    await pressPlay();
    await clickButton('Pause');
    await clickButton('Play');

    expect(audio().srcHistory).toHaveLength(1);
  });

  it('shows a media error in place of the show, and retries on play', async () => {
    renderCard();
    await pressPlay();
    audio().error = { code: 2 };
    await inAct(() => audio().emit('error'));

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    await clickButton('Play');
    expect(audio().srcHistory).toHaveLength(2);
  });

  it('restarts when past a few seconds, and goes back near the start', async () => {
    renderCard();
    await pressPlay();
    await inAct(() => audio().advanceTo(20, 600));
    await clickButton('Previous Track');
    expect(audio().currentTime).toBe(0);
    expect(audio().src).toContain(FEATURED[0]);

    await clickButton('Previous Track');
    expect(audio().src).toContain(FEATURED[2]);
  });

  it('shows buffering on waiting and clears it once playing', async () => {
    renderCard();
    await pressPlay();
    await inAct(() => audio().emit('waiting'));
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    await inAct(() => audio().emit('playing'));
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });
});

describe('the progress bar', () => {
  it('stays at 0 until the length is known, then follows the audio', async () => {
    renderCard();
    expect(barWidth()).toBe('0%');
    await pressPlay();
    await inAct(() => audio().advanceTo(150, 600));
    expect(barWidth()).toBe('25%');
  });

  it('seeks on a tap', async () => {
    renderCard();
    await pressPlay();
    await inAct(() => audio().advanceTo(0, 600));
    fireEvent.pointerDown(hitArea(), { button: 0, pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(hitArea(), { button: 0, pointerId: 1, clientX: 200 });
    expect(audio().currentTime).toBe(300);
  });

  it('has nothing to drag on live radio', async () => {
    renderCard();
    await inAct(() => playItem(station, [station]));
    fireEvent.pointerDown(hitArea(), { button: 0, pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(hitArea(), { button: 0, pointerId: 1, clientX: 200 });
    expect(audio().seeks).toEqual([]);
  });
});

test('shows drawn art instead of a broken image', async () => {
  renderCard();
  const image = document.querySelector('.albumArt img');
  if (!image) throw new Error('No album art');
  await inAct(() => fireEvent.error(image));
  expect(document.querySelector('.albumArt img')).toBeNull();
  expect(document.querySelector('.albumArt svg')).not.toBeNull();
});

describe('the card opens the app that is playing', () => {
  it('Search opens Podcasts for a podcast, and there is no full-screen player', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: 'Open full media player' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Search media' }));
    expect(screen.getByLabelText('open app')).toHaveTextContent('podcasts');
    // Pressed again, it leaves the app open.
    fireEvent.click(screen.getByRole('button', { name: 'Search media' }));
    expect(screen.getByLabelText('open app')).toHaveTextContent('podcasts');
  });
});
