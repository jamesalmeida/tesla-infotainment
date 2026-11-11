import { vi } from 'vitest';
import { startIndicator, stopIndicator } from './carSounds';

test('the indicator is one looping element, however often it is started', () => {
  const created: HTMLAudioElement[] = [];
  const NativeAudio = window.Audio;
  vi.spyOn(window, 'Audio').mockImplementation(function (src?: string) {
    const audio = new NativeAudio(src);
    let paused = true;
    Object.defineProperty(audio, 'paused', { get: () => paused });
    audio.play = vi.fn(() => {
      paused = false;
      return Promise.resolve();
    });
    audio.pause = vi.fn(() => {
      paused = true;
    });
    created.push(audio);
    return audio;
  });

  startIndicator(50);
  startIndicator(50);
  startIndicator(80);

  expect(created).toHaveLength(1);
  expect(created[0].loop).toBe(true);
  expect(created[0].play).toHaveBeenCalledTimes(1);

  stopIndicator();
  expect(created[0].pause).toHaveBeenCalledTimes(1);
  expect(created[0].paused).toBe(true);

  startIndicator(50);
  expect(created).toHaveLength(1);
  expect(created[0].play).toHaveBeenCalledTimes(2);
  stopIndicator();
});
