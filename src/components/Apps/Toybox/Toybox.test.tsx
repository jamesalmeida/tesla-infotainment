import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import { litLamps, PATTERNS, stepAt } from './modules/lightPatterns';
import { sketchFileName, strokeSegments, undoStroke } from './modules/sketch';
import { gainFor, soundLength, SOUNDS } from './modules/sounds';
import { Toybox } from './Toybox';

const renderToybox = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Toybox />
    </CarStateProvider>,
  );

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const point = { x: 0.1, y: 0.2 };

test('a tap draws a dot and a drag draws segments', () => {
  const stroke = { token: '--color-accent', size: 3, points: [point] };
  expect(strokeSegments(stroke)).toEqual([[point, point]]);
  expect(strokeSegments({ ...stroke, points: [point, point, point] })).toHaveLength(2);
});

test('undo drops the last stroke', () => {
  const strokes = [
    { token: 'a', size: 1, points: [] },
    { token: 'b', size: 1, points: [] },
  ];
  expect(undoStroke(strokes).map((stroke) => stroke.token)).toEqual(['a']);
});

test('saved sketches are named by date', () => {
  expect(sketchFileName(new Date(2026, 0, 9))).toBe('sketch-2026-01-09.png');
});

test('a light pattern steps on the beat and loops', () => {
  const [sweep] = PATTERNS;
  expect(stepAt(sweep, 0)).toBe(0);
  expect(stepAt(sweep, 0.5)).toBe(1);
  expect(stepAt(sweep, 2)).toBe(0);
  expect(litLamps(sweep, 0)).toEqual(['headLeft', 'headRight']);
});

test('sound follows the car volume and stays well below full scale', () => {
  expect(gainFor(0)).toBe(0);
  expect(gainFor(100)).toBeCloseTo(0.3);
  expect(gainFor(500)).toBeCloseTo(0.3);
  SOUNDS.forEach((sound) => expect(soundLength(sound)).toBeGreaterThan(0));
});

test('Sketchpad is the first module, and drawing enables its tools', () => {
  renderToybox();
  expect(screen.getByRole('tab', { name: 'Sketchpad' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: 'Save image' })).toBeDisabled();

  const canvas = screen.getByRole('img', { name: 'Drawing area' });
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });

  expect(screen.getByRole('button', { name: 'Save image' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('button', { name: 'Save image' })).toBeDisabled();
});

test('the light show only flashes once started', () => {
  vi.useFakeTimers();
  const { container } = renderToybox();
  fireEvent.click(screen.getByRole('tab', { name: 'Light Show' }));
  const lit = () => container.querySelectorAll('.lit').length;
  expect(lit()).toBe(0);

  fireEvent.click(screen.getByRole('button', { name: 'Start show' }));
  act(() => {
    vi.advanceTimersByTime(100);
  });

  expect(lit()).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Stop show' }));
  expect(lit()).toBe(0);
  vi.useRealTimers();
});

test('the soundboard explains itself when the browser has no audio', () => {
  renderToybox();
  fireEvent.click(screen.getByRole('tab', { name: 'Soundboard' }));
  expect(screen.getByText(/can't synthesise sound/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fanfare' })).toBeDisabled();
});
