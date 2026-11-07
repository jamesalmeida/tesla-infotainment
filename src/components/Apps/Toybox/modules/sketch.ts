export interface Point {
  // Fractions of the canvas, 0 to 1.
  x: number;
  y: number;
}

export interface Stroke {
  token: string;
  size: number;
  points: Point[];
}

export const INK_TOKENS = [
  { token: '--color-text-strong', label: 'Ink' },
  { token: '--color-accent', label: 'Blue' },
  { token: '--color-danger', label: 'Red' },
  { token: '--color-success', label: 'Green' },
  { token: '--color-warning', label: 'Amber' },
] as const;

export const BRUSH_SIZES = [3, 7, 14] as const;

// A single tap still leaves a dot.
export function strokeSegments({ points }: Stroke): [Point, Point][] {
  if (points.length === 1) return [[points[0], points[0]]];
  return points.slice(1).map((point, index) => [points[index], point]);
}

export const undoStroke = (strokes: Stroke[]): Stroke[] => strokes.slice(0, -1);

export const sketchFileName = (date: Date): string =>
  `sketch-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.png`;
