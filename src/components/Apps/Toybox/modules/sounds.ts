export interface ToneStep {
  frequency: number;
  seconds: number;
}

export interface Sound {
  id: string;
  label: string;
  wave: OscillatorType;
  steps: ToneStep[];
}

const step = (frequency: number, seconds: number): ToneStep => ({ frequency, seconds });

// Synthesised on the spot, so there are no audio files to license or host.
export const SOUNDS: Sound[] = [
  {
    id: 'beep',
    label: 'Polite beep',
    wave: 'sine',
    steps: [step(880, 0.14), step(0, 0.08), step(880, 0.14)],
  },
  {
    id: 'rise',
    label: 'Launch',
    wave: 'sawtooth',
    steps: [220, 330, 440, 660, 880].map((f) => step(f, 0.11)),
  },
  {
    id: 'fall',
    label: 'Power down',
    wave: 'triangle',
    steps: [880, 660, 440, 330, 220].map((f) => step(f, 0.13)),
  },
  {
    id: 'chord',
    label: 'Fanfare',
    wave: 'square',
    steps: [step(523, 0.12), step(659, 0.12), step(784, 0.12), step(1047, 0.3)],
  },
  {
    id: 'wobble',
    label: 'Wobble',
    wave: 'sine',
    steps: [300, 420, 300, 420, 300, 420].map((f) => step(f, 0.09)),
  },
  {
    id: 'robot',
    label: 'Robot',
    wave: 'square',
    steps: [150, 600, 250, 900, 180].map((f) => step(f, 0.08)),
  },
];

export const soundLength = (sound: Sound): number =>
  sound.steps.reduce((total, { seconds }) => total + seconds, 0);

// The car's volume runs 0 to 100. Synth waves are loud, so full volume is kept well below 1.
export const gainFor = (volume: number): number => (Math.min(100, Math.max(0, volume)) / 100) * 0.3;
