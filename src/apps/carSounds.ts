import { getAudioPath } from '../utils/assetPaths';

export const CAR_SOUND_FILES = {
  door: 'car-door-close-6929.d6abd9e73d75ca9067ba.mp3',
  indicator: '039355_hazard-lights-60570.d22f9442d5a63d906e64.mp3',
  seatbelt: 'car-seatbelt-alarm-86950.9524ed4da2c0b1a7af7a.mp3',
} as const;

export type CarSound = keyof typeof CAR_SOUND_FILES;

// One-shot sounds. The indicator loops instead, through startIndicator.
type OneShotSound = Exclude<CarSound, 'indicator'>;

const MAX_VOLUME = 0.35;

// The audio element is created on demand and thrown away after playing. These are short
// samples, so there is nothing to keep alive.
const toElementVolume = (volume: number) =>
  Math.max(0, Math.min(MAX_VOLUME, (volume / 100) * MAX_VOLUME));

export function playCarSound(sound: OneShotSound, volume: number): void {
  if (typeof Audio === 'undefined') return;
  const audio = new Audio(getAudioPath(CAR_SOUND_FILES[sound]));
  audio.volume = toElementVolume(volume);
  audio.play().catch(() => {
    // Autoplay can be blocked before the first gesture. A missing chime is harmless.
  });
}

// The indicator ticks for as long as a signal or the hazards are on, so it is one looping
// element rather than a new sound per press. Starting it twice never layers a second copy,
// and stopping it silences it at once.
let indicator: HTMLAudioElement | null = null;

export function startIndicator(volume: number): void {
  if (typeof Audio === 'undefined') return;
  if (!indicator) {
    indicator = new Audio(getAudioPath(CAR_SOUND_FILES.indicator));
    indicator.loop = true;
  }
  indicator.volume = toElementVolume(volume);
  if (!indicator.paused) return;
  indicator.currentTime = 0;
  indicator.play().catch(() => {
    // Blocked before the first gesture; the lights still blink.
  });
}

export function stopIndicator(): void {
  if (!indicator) return;
  indicator.pause();
  indicator.currentTime = 0;
}

export function setIndicatorVolume(volume: number): void {
  if (indicator) indicator.volume = toElementVolume(volume);
}

// The lock chime is generated rather than sampled, so it has no file to download.
export function playLockChime(volume: number): void {
  if (typeof AudioContext === 'undefined') return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  gain.gain.value = Math.max(0, Math.min(0.08, (volume / 100) * 0.08));
  oscillator.frequency.value = 880;
  oscillator.connect(gain).connect(audio.destination);
  oscillator.onended = () => void audio.close();
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.12);
}
