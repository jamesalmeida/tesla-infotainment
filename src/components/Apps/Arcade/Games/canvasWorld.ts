import { fitWorld, type Size, type WorldView } from './runtime';

// Clears the canvas and leaves the context drawing in world units, clipped to the world.
// Callers wrap this in ctx.save() and ctx.restore().
export const enterWorld = (
  ctx: CanvasRenderingContext2D,
  size: Size,
  worldWidth: number,
  worldHeight: number,
  surround: string,
): WorldView => {
  const view = fitWorld(size, worldWidth, worldHeight);
  ctx.fillStyle = surround;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);
  ctx.beginPath();
  ctx.rect(0, 0, worldWidth, worldHeight);
  ctx.clip();
  return view;
};

interface TextStyle {
  size: number;
  color: string;
  align?: CanvasTextAlign;
  weight?: number;
}

// Text at a world position, rendered at screen scale so it stays sharp.
export const worldText = (
  ctx: CanvasRenderingContext2D,
  view: WorldView,
  text: string,
  x: number,
  y: number,
  { size, color, align = 'left', weight = 600 }: TextStyle,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / view.scale, 1 / view.scale);
  ctx.font = `${weight} ${size * view.scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

// Our top-down car, centred on the origin with its nose along +x.
export const drawCar = (
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  body: string,
): void => {
  const wheelLength = length * 0.2;
  const wheelWidth = width * 0.14;
  ctx.fillStyle = '#14171a';
  for (const x of [-length * 0.3, length * 0.3]) {
    for (const y of [-width / 2, width / 2]) {
      ctx.fillRect(x - wheelLength / 2, y - wheelWidth / 2, wheelLength, wheelWidth);
    }
  }

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length, width, width * 0.3);
  ctx.fill();

  ctx.fillStyle = 'rgba(10, 16, 24, 0.75)';
  ctx.beginPath();
  ctx.roundRect(-length * 0.26, -width * 0.36, length * 0.56, width * 0.72, width * 0.2);
  ctx.fill();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-length * 0.14, -width * 0.3, length * 0.28, width * 0.6, width * 0.1);
  ctx.fill();

  ctx.fillStyle = '#fff7c8';
  ctx.fillRect(length / 2 - length * 0.03, -width * 0.38, length * 0.03, width * 0.2);
  ctx.fillRect(length / 2 - length * 0.03, width * 0.18, length * 0.03, width * 0.2);
  ctx.fillStyle = '#e03131';
  ctx.fillRect(-length / 2, -width * 0.38, length * 0.03, width * 0.2);
  ctx.fillRect(-length / 2, width * 0.18, length * 0.03, width * 0.2);
};

// A lightning bolt centred on the origin.
export const drawBolt = (ctx: CanvasRenderingContext2D, height: number, color: string): void => {
  const unit = height / 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(1 * unit, -5 * unit);
  ctx.lineTo(-3 * unit, 1 * unit);
  ctx.lineTo(-0.3 * unit, 1 * unit);
  ctx.lineTo(-1 * unit, 5 * unit);
  ctx.lineTo(3 * unit, -1 * unit);
  ctx.lineTo(0.3 * unit, -1 * unit);
  ctx.closePath();
  ctx.fill();
};
