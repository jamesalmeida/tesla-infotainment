import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  connectPlayback,
  resetMediaLibrary,
  type PlaybackEngine,
  type PlaybackReport,
} from '../../../apps/mediaLibrary';
import { canOpenApp, initialCarState } from '../../../state/carState';
import { Caraoke } from './Caraoke';
import {
  activeLineIndex,
  BPM,
  encodeWav,
  lineProgress,
  LYRICS,
  renderSong,
  secondsUntilFirstLine,
  SECONDS_PER_BEAT,
  SONG,
  SONG_SECONDS,
} from './song';

let report: (report: PlaybackReport) => void = () => {};
const engine: PlaybackEngine = {
  play: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  stop: vi.fn(),
  setVolume: vi.fn(),
  loadedId: vi.fn(() => null),
};

const firstLineStart = LYRICS[0].startBeat * SECONDS_PER_BEAT;

beforeEach(() => {
  vi.clearAllMocks();
  resetMediaLibrary();
  connectPlayback((reportPlayback) => {
    report = reportPlayback;
    return engine;
  });
  URL.createObjectURL = vi.fn(() => 'blob:song');
  URL.revokeObjectURL = vi.fn();
});

describe('lyric timing', () => {
  test('no line is active during the intro', () => {
    expect(activeLineIndex(LYRICS, 0)).toBe(-1);
    expect(activeLineIndex(LYRICS, firstLineStart - 0.01)).toBe(-1);
  });

  test('each line takes over exactly on its beat', () => {
    expect(activeLineIndex(LYRICS, firstLineStart)).toBe(0);
    const third = LYRICS[2].startBeat * SECONDS_PER_BEAT;
    expect(activeLineIndex(LYRICS, third - 0.01)).toBe(1);
    expect(activeLineIndex(LYRICS, third)).toBe(2);
  });

  test('the last line holds through the outro', () => {
    expect(activeLineIndex(LYRICS, SONG_SECONDS)).toBe(LYRICS.length - 1);
  });

  test('progress runs from 0 to 1 across a line and stays in range', () => {
    const [line] = LYRICS;
    const length = line.beats * SECONDS_PER_BEAT;
    expect(lineProgress(line, firstLineStart - 5)).toBe(0);
    expect(lineProgress(line, firstLineStart + length / 2)).toBeCloseTo(0.5);
    expect(lineProgress(line, firstLineStart + length * 2)).toBe(1);
  });

  test('the count-in ends when the first line starts', () => {
    expect(secondsUntilFirstLine(LYRICS, 0)).toBeCloseTo(firstLineStart);
    expect(secondsUntilFirstLine(LYRICS, firstLineStart + 1)).toBe(0);
  });

  test('lines never overlap and all fit in the song', () => {
    LYRICS.slice(1).forEach((line, index) => {
      expect(line.startBeat).toBeGreaterThanOrEqual(LYRICS[index].startBeat + LYRICS[index].beats);
    });
    const last = LYRICS[LYRICS.length - 1];
    expect((last.startBeat + last.beats) * SECONDS_PER_BEAT).toBeLessThanOrEqual(SONG_SECONDS);
    expect(BPM).toBeGreaterThan(0);
  });
});

describe('backing track', () => {
  test('renders the whole song without clipping far past full scale', () => {
    const rate = 2000;
    const samples = renderSong(rate);
    expect(samples.length).toBe(Math.ceil(SONG_SECONDS * rate));
    const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
    expect(peak).toBeGreaterThan(0.05);
    expect(peak).toBeLessThan(1.2);
  });

  test('encodes a valid WAV header', () => {
    const buffer = encodeWav(new Float32Array([0, 1, -1]), 8000);
    const view = new DataView(buffer);
    const tag = (offset: number) =>
      String.fromCharCode(...new Uint8Array(buffer.slice(offset, offset + 4)));

    expect(buffer.byteLength).toBe(50);
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getInt16(46, true)).toBe(0x7fff);
  });
});

describe('screen', () => {
  test('Caraoke is parked only', () => {
    expect(canOpenApp({ ...initialCarState, gear: 'D' }, 'caraoke').allowed).toBe(false);
    expect(canOpenApp(initialCarState, 'caraoke').allowed).toBe(true);
  });

  test('nothing plays until asked, then the lyrics follow the player', () => {
    render(<Caraoke />);
    expect(screen.getByText('Press Sing to start')).toBeInTheDocument();
    expect(engine.play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sing' }));
    expect(engine.play).toHaveBeenCalledTimes(1);
    expect(vi.mocked(engine.play).mock.calls[0][0]).toMatchObject({
      id: SONG.id,
      streamUrl: 'blob:song',
    });

    act(() => report({ type: 'playing' }));
    act(() => report({ type: 'position', seconds: firstLineStart + 1 }));

    expect(screen.getByText(LYRICS[0].text)).toBeInTheDocument();
    expect(screen.getByText(LYRICS[1].text)).toBeInTheDocument();
  });

  test('leaving the screen stops the song', () => {
    const { unmount } = render(<Caraoke />);
    fireEvent.click(screen.getByRole('button', { name: 'Sing' }));
    vi.mocked(engine.stop).mockClear();

    unmount();

    expect(engine.stop).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:song');
  });

  test('a playback failure is shown', () => {
    render(<Caraoke />);
    fireEvent.click(screen.getByRole('button', { name: 'Sing' }));
    act(() => report({ type: 'failed', message: 'No audio device' }));
    expect(screen.getByRole('alert')).toHaveTextContent('No audio device');
  });
});
