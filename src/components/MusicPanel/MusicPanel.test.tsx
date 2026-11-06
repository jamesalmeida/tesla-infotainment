import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { getImagePath } from '../../utils/assetPaths';
import { MusicPanel } from './MusicPanel';

vi.mock('../../utils/assetPaths', () => ({
  getImagePath: vi.fn((name: string) => `/img/${name}`),
}));

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

const barWidth = () => document.querySelector<HTMLElement>('.progressForeground')?.style.width;
const hitArea = () => {
  const element = document.querySelector<HTMLElement>('.progressHitArea');
  if (!element) throw new Error('No progress bar');
  return element;
};
const isBuffering = () => document.querySelector('[aria-busy="true"]') !== null;

const panelRenders = () => vi.mocked(getImagePath).mock.calls.length;

const TRACK_FILES = ['lex_ai_pieter_levels', 'lex_ai_elon_musk', 'PDP5840775995'];

beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  // Math.random() picks the first track.
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.mocked(getImagePath).mockClear();
  Element.prototype.setPointerCapture = vi.fn();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    width: 200,
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the audio element (#85)', () => {
  it('constructs exactly one element however often the panel renders', async () => {
    const { rerender } = render(<MusicPanel volume={50} />);
    for (let volume = 0; volume < 10; volume += 1) rerender(<MusicPanel volume={volume} />);
    await pressPlay();
    for (let second = 1; second <= 12; second += 1) {
      await inAct(() => audio().advanceTo(second, 60));
    }
    await clickButton('Next Track');

    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('keeps to one element through the StrictMode remount, with its source intact', () => {
    render(
      <StrictMode>
        <MusicPanel volume={50} />
      </StrictMode>,
    );

    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio().src).toContain(TRACK_FILES[0]);
  });

  it('requests nothing until asked to play', () => {
    const { rerender } = render(<MusicPanel volume={50} />);
    rerender(<MusicPanel volume={60} />);

    expect(audio().preload).toBe('none');
    expect(audio().playCalls).toBe(0);
    expect(audio().srcHistory).toHaveLength(1);
  });

  it('pauses and clears the source on unmount', async () => {
    const { unmount } = render(<MusicPanel volume={50} />);
    await pressPlay();

    unmount();

    expect(audio().paused).toBe(true);
    expect(audio().src).toBe('');
    expect(audio().loadCalls).toBe(1);
  });

  it('follows the volume prop', () => {
    const { rerender } = render(<MusicPanel volume={50} />);
    expect(audio().volume).toBe(0.5);
    rerender(<MusicPanel volume={30} />);
    expect(audio().volume).toBe(0.3);
  });
});

describe('the #47 scenarios', () => {
  it('starts the next track at 0 when Next is pressed mid-track', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(15.8, 60));

    await clickButton('Next Track');

    expect(audio().src).toContain(TRACK_FILES[1]);
    expect(audio().currentTime).toBe(0);
    expect(audio().seeks).toEqual([]);
    expect(audio().paused).toBe(false);
  });

  it('advances and keeps playing when a track finishes', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(59, 60));

    await inAct(() => audio().reachEnd());

    expect(audio().src).toContain(TRACK_FILES[1]);
    expect(audio().currentTime).toBe(0);
    expect(audio().paused).toBe(false);
    expect(screen.getByAltText('Pause')).toBeInTheDocument();
  });

  it('never shows the play icon between the end of one track and the next', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    audio().duration = 60;

    audio().ended = true;
    await inAct(() => audio().emit('pause'));

    expect(screen.getByAltText('Pause')).toBeInTheDocument();
  });

  it('shows the play icon and an error when play() is rejected', async () => {
    render(<MusicPanel volume={50} />);
    audio().rejectPlayWith = new DOMException('Blocked', 'NotAllowedError');

    await clickButton('Play');

    expect(screen.getByAltText('Play')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/blocked/i);
  });

  it('does not reassign src on play or pause, so the position survives', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(20, 60));

    await clickButton('Pause');
    await inAct(() => undefined);
    await pressPlay();

    expect(audio().srcHistory).toHaveLength(1);
    expect(audio().loadCalls).toBe(0);
    expect(audio().currentTime).toBe(20);
  });

  it('keeps the bar at 0% before the duration is known and after a track change', async () => {
    render(<MusicPanel volume={50} />);
    expect(barWidth()).toBe('0%');

    await pressPlay();
    await inAct(() => audio().advanceTo(30, 60));
    expect(barWidth()).toBe('50%');

    await clickButton('Next Track');
    expect(barWidth()).toBe('0%');
  });
});

describe('the transport icon', () => {
  it('follows the element rather than the button press', async () => {
    render(<MusicPanel volume={50} />);

    await clickButton('Play');
    expect(isBuffering()).toBe(true);

    await inAct(() => audio().emit('playing'));
    expect(isBuffering()).toBe(false);
    expect(screen.getByAltText('Pause')).toBeInTheDocument();

    // Something other than the button pauses it, like a headset or the OS.
    await inAct(() => audio().pause());
    expect(screen.getByAltText('Play')).toBeInTheDocument();
  });

  it('shows buffering on waiting and clears it when playback resumes', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();

    await inAct(() => audio().emit('waiting'));
    expect(isBuffering()).toBe(true);

    await inAct(() => audio().emit('playing'));
    expect(isBuffering()).toBe(false);
  });

  it('can be paused while still loading', async () => {
    render(<MusicPanel volume={50} />);
    await clickButton('Play');

    await clickButton('Pause');

    expect(audio().paused).toBe(true);
    expect(screen.getByAltText('Play')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores the AbortError from a play() replaced by a new track', async () => {
    render(<MusicPanel volume={50} />);
    await clickButton('Play');

    await clickButton('Next Track');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(audio().playCalls).toBe(2);
  });

  it('stays silent on Next while paused', async () => {
    render(<MusicPanel volume={50} />);

    await clickButton('Next Track');

    expect(audio().playCalls).toBe(0);
    expect(screen.getByAltText('Play')).toBeInTheDocument();
  });
});

describe('errors', () => {
  const failLoading = async () => {
    await clickButton('Play');
    audio().error = { code: 4 };
    await inAct(() => audio().emit('error'));
  };

  it('shows a media error in place of the album, with the play icon', async () => {
    render(<MusicPanel volume={50} />);

    await failLoading();

    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable/i);
    expect(screen.queryByText('Lex Fridman Podcast')).not.toBeInTheDocument();
    expect(screen.getByAltText('Play')).toBeInTheDocument();
  });

  it('reloads the track when play is pressed again', async () => {
    render(<MusicPanel volume={50} />);
    await failLoading();

    await clickButton('Play');

    expect(audio().srcHistory).toEqual([audio().src, audio().src]);
    expect(audio().playCalls).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('moves on with Next, trying to play the new track', async () => {
    render(<MusicPanel volume={50} />);
    await failLoading();

    await clickButton('Next Track');

    expect(audio().src).toContain(TRACK_FILES[1]);
    expect(audio().playCalls).toBe(2);
  });
});

describe('previous', () => {
  it('restarts the track when past the threshold, without changing track', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(10, 60));

    await clickButton('Previous Track');

    expect(audio().currentTime).toBe(0);
    expect(audio().srcHistory).toHaveLength(1);
    expect(barWidth()).toBe('0%');
  });

  it('goes to the previous track near the start, however long since the last press', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(2, 60));

    await clickButton('Previous Track');

    expect(audio().src).toContain(TRACK_FILES[2]);
    expect(audio().paused).toBe(false);
  });

  it('goes back on a failed track even if it failed part way through', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    await inAct(() => audio().advanceTo(10, 60));
    audio().error = { code: 2 };
    await inAct(() => audio().emit('error'));

    await clickButton('Previous Track');

    expect(audio().src).toContain(TRACK_FILES[2]);
  });
});

describe('keyboard shortcuts', () => {
  const press = (key: string, shiftKey = true) =>
    inAct(() => fireEvent.keyDown(window, { key, shiftKey }));

  it('keeps Shift+Space, Shift+> and Shift+<', async () => {
    render(<MusicPanel volume={50} />);

    await press(' ');
    expect(audio().playCalls).toBe(1);
    await inAct(() => audio().emit('playing'));
    await press(' ');
    expect(audio().paused).toBe(true);

    await press('>');
    expect(audio().src).toContain(TRACK_FILES[1]);
    await press('<');
    expect(audio().src).toContain(TRACK_FILES[0]);
  });

  it('ignores the same keys without Shift', async () => {
    render(<MusicPanel volume={50} />);

    await press(' ', false);

    expect(audio().playCalls).toBe(0);
  });
});

describe('the progress bar', () => {
  const withDuration = async () => {
    await pressPlay();
    await inAct(() => audio().advanceTo(0, 100));
  };

  // Each in its own act, as React renders between discrete events in a browser.
  const pointer = (
    type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
    clientX: number,
    button = 0,
  ) => inAct(() => fireEvent[type](hitArea(), { clientX, button, pointerId: 7 }));

  it('seeks on a tap', async () => {
    render(<MusicPanel volume={50} />);
    await withDuration();

    await pointer('pointerDown', 150);
    await pointer('pointerUp', 150);

    expect(audio().currentTime).toBe(25);
    expect(barWidth()).toBe('25%');
  });

  it('follows a drag and seeks once, on release, keeping hold of the pointer', async () => {
    render(<MusicPanel volume={50} />);
    await withDuration();

    await pointer('pointerDown', 150);
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(7);

    await pointer('pointerMove', 200);
    expect(barWidth()).toBe('50%');
    expect(audio().seeks).toEqual([]);

    await pointer('pointerUp', 250);
    expect(audio().seeks).toEqual([75]);
  });

  it('holds the dragged position while time updates arrive', async () => {
    render(<MusicPanel volume={50} />);
    await withDuration();

    await pointer('pointerDown', 200);
    await inAct(() => audio().advanceTo(10, 100));

    expect(barWidth()).toBe('50%');
  });

  it('clamps a drag that leaves the bar', async () => {
    render(<MusicPanel volume={50} />);
    await withDuration();

    await pointer('pointerDown', 150);
    await pointer('pointerUp', 900);

    expect(audio().currentTime).toBe(100);
  });

  it('drops a cancelled drag without seeking', async () => {
    render(<MusicPanel volume={50} />);
    await withDuration();
    await inAct(() => audio().advanceTo(10, 100));

    await pointer('pointerDown', 200);
    await pointer('pointerCancel', 200);

    expect(audio().seeks).toEqual([]);
    expect(barWidth()).toBe('10%');
  });

  it('ignores moves without a press, other buttons, and an unknown duration', async () => {
    render(<MusicPanel volume={50} />);

    await pointer('pointerDown', 150);
    await pointer('pointerUp', 150);
    expect(audio().seeks).toEqual([]);

    await withDuration();
    await pointer('pointerMove', 150);
    await pointer('pointerDown', 150, 2);
    await pointer('pointerUp', 150, 2);
    expect(audio().seeks).toEqual([]);
  });
});

describe('re-rendering (#92)', () => {
  it('re-renders only the progress bar on timeupdate', async () => {
    render(<MusicPanel volume={50} />);
    await pressPlay();
    const renders = panelRenders();

    for (let second = 1; second <= 5; second += 1) {
      await inAct(() => audio().advanceTo(second, 10));
    }

    expect(barWidth()).toBe('50%');
    expect(panelRenders()).toBe(renders);
  });

  it('skips rendering when its parent re-renders with the same volume', () => {
    const { rerender } = render(<MusicPanel volume={50} />);
    const renders = panelRenders();

    rerender(<MusicPanel volume={50} />);

    expect(panelRenders()).toBe(renders);
  });
});
