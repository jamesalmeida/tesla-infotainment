export interface LyricLine {
  text: string;
  startBeat: number;
  beats: number;
}

// [MIDI note, beats]. A null note is a rest.
type Note = [number | null, number];

const LINE_BEATS = 8;
const BEATS_PER_BAR = 4;
const INTRO_BEATS = 8;
const OUTRO_BEATS = 8;

export const BPM = 100;
export const SECONDS_PER_BEAT = 60 / BPM;

// Words and melody were written for this project, so they are free to use and to ship.
const VERSES = [
  'Keys are on the table, I just walk out the door',
  'Mirrors fold their shoulders, like they did before',
  'Battery says eighty, and the morning says go',
  'Every green light humming on the long road home',
  'Wipers keep the rhythm, there is rain on the glass',
  'Regen on the hillside, watch the miles go past',
  'Map says take the coastline, I am fine with that',
  'Windows down at sunset, turn the music back',
  'So sing it to the dashboard, sing it to the sky',
  'Nobody can hear you when the highway goes by',
  'Park it in the driveway, let the engine stay still',
  'There never was an engine, but it hums to me still',
];

const PHRASES: Note[][] = [
  [
    [64, 1],
    [67, 1],
    [69, 1],
    [67, 1],
    [64, 2],
    [62, 2],
  ],
  [
    [60, 1],
    [64, 1],
    [67, 1],
    [64, 1],
    [62, 2],
    [60, 2],
  ],
  [
    [69, 1],
    [69, 1],
    [67, 1],
    [64, 1],
    [65, 2],
    [64, 2],
  ],
  [
    [62, 1],
    [64, 1],
    [65, 1],
    [69, 1],
    [67, 3],
    [null, 1],
  ],
];

// One chord a bar: the root, then the notes above it.
const CHORDS = [
  [48, 64, 67, 72],
  [43, 62, 67, 71],
  [45, 64, 69, 72],
  [41, 65, 69, 72],
];

export const LYRICS: LyricLine[] = VERSES.map((text, index) => ({
  text,
  startBeat: INTRO_BEATS + index * LINE_BEATS,
  beats: LINE_BEATS,
}));

export const TOTAL_BEATS = INTRO_BEATS + VERSES.length * LINE_BEATS + OUTRO_BEATS;
export const SONG_SECONDS = TOTAL_BEATS * SECONDS_PER_BEAT;

export const SONG = {
  id: 'caraoke-long-road-home',
  title: 'The Long Road Hum',
  subtitle: 'Simulator House Band',
};

const lineStart = (line: LyricLine) => line.startBeat * SECONDS_PER_BEAT;

// The line being sung, or the one coming up during a gap. -1 before the first has started.
export function activeLineIndex(lines: LyricLine[], seconds: number): number {
  let active = -1;
  lines.forEach((line, index) => {
    if (seconds >= lineStart(line)) active = index;
  });
  return active;
}

// How far through the line the singer should be, 0 to 1.
export function lineProgress(line: LyricLine, seconds: number): number {
  const duration = line.beats * SECONDS_PER_BEAT;
  return Math.min(1, Math.max(0, (seconds - lineStart(line)) / duration));
}

export const secondsUntilFirstLine = (lines: LyricLine[], seconds: number): number =>
  Math.max(0, lineStart(lines[0]) - seconds);

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function addTone(
  samples: Float32Array,
  rate: number,
  start: number,
  seconds: number,
  midi: number,
  level: number,
) {
  const first = Math.floor(start * rate);
  const count = Math.min(Math.floor(seconds * rate), samples.length - first);
  const step = (2 * Math.PI * frequency(midi)) / rate;
  for (let i = 0; i < count; i += 1) {
    const envelope = Math.min(1, i / 200) * Math.exp((-3 * i) / count);
    samples[first + i] += level * envelope * (Math.sin(i * step) + 0.3 * Math.sin(i * step * 2));
  }
}

// The backing track, drawn straight into samples, so there is no audio file to host or license.
export function renderSong(rate: number): Float32Array {
  const samples = new Float32Array(Math.ceil(SONG_SECONDS * rate));

  for (let bar = 0; bar < TOTAL_BEATS / BEATS_PER_BAR; bar += 1) {
    const [root, ...notes] = CHORDS[bar % CHORDS.length];
    const start = bar * BEATS_PER_BAR * SECONDS_PER_BEAT;
    const length = BEATS_PER_BAR * SECONDS_PER_BEAT;
    addTone(samples, rate, start, length, root, 0.28);
    notes.forEach((note) => addTone(samples, rate, start, length, note, 0.07));
  }

  LYRICS.forEach((line, index) => {
    let beat = line.startBeat;
    PHRASES[index % PHRASES.length].forEach(([note, beats]) => {
      const seconds = beats * SECONDS_PER_BEAT;
      if (note !== null) addTone(samples, rate, beat * SECONDS_PER_BEAT, seconds, note, 0.22);
      beat += beats;
    });
  });

  return samples;
}

// Wraps samples in a 16-bit mono WAV, the simplest thing an audio element can play.
export function encodeWav(samples: Float32Array, rate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clipped * 0x7fff, true);
  });

  return buffer;
}
