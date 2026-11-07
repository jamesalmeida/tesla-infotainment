import { drawBolt, drawCar, enterWorld, worldText } from '../canvasWorld';
import type { Size, WorldView } from '../runtime';
import {
  MAX_LEVEL,
  MAX_STRIKES,
  SITE_CAPACITY,
  STALLS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  siteLoad,
  stallBounds,
  type AmpState,
} from './rules';

const CAR_COLORS = ['#4dabf7', '#ff8787', '#ffd43b', '#b197fc', '#63e6be', '#e9ecef'];

const drawBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  share: number,
  color: string,
) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.min(1, share), height);
};

const drawStall = (
  ctx: CanvasRenderingContext2D,
  view: WorldView,
  state: AmpState,
  index: number,
) => {
  const stall = state.stalls[index];
  const { x, y, width, height } = stallBounds(index);
  const centerX = x + width / 2;
  const isSelected = state.selected === index;

  ctx.fillStyle = '#242a30';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 0.14);
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#74c0fc' : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = isSelected ? 0.08 : 0.03;
  ctx.stroke();

  worldText(ctx, view, '+', x + width - 0.3, y + 0.32, {
    size: 0.5,
    color: 'rgba(255, 255, 255, 0.45)',
    align: 'center',
  });
  worldText(ctx, view, '−', x + width - 0.3, y + height - 0.32, {
    size: 0.5,
    color: 'rgba(255, 255, 255, 0.45)',
    align: 'center',
  });

  // Power pips along the top of the stall.
  for (let pip = 0; pip < MAX_LEVEL; pip += 1) {
    ctx.save();
    ctx.translate(x + 0.4 + pip * 0.5, y + 0.38);
    drawBolt(ctx, 0.46, pip < stall.level ? '#ffd43b' : 'rgba(255, 255, 255, 0.16)');
    ctx.restore();
  }

  if (!stall.car) {
    worldText(ctx, view, 'Free', centerX, y + height / 2, {
      size: 0.36,
      color: 'rgba(255, 255, 255, 0.35)',
      align: 'center',
    });
    return;
  }

  const { car } = stall;
  ctx.save();
  ctx.translate(centerX, y + height * 0.42);
  ctx.rotate(-Math.PI / 2);
  drawCar(ctx, 2, 1.05, CAR_COLORS[car.id % CAR_COLORS.length]);
  ctx.restore();

  const barX = x + 0.3;
  const barWidth = width - 0.6;
  const patience = car.patience / car.fullPatience;
  drawBar(ctx, barX, y + height - 1.08, barWidth, 0.2, car.charged / car.need, '#51cf66');
  drawBar(
    ctx,
    barX,
    y + height - 0.76,
    barWidth,
    0.12,
    patience,
    patience < 0.3 ? '#ff6b6b' : '#adb5bd',
  );
};

export const draw = (ctx: CanvasRenderingContext2D, state: AmpState, size: Size): void => {
  ctx.save();
  const view = enterWorld(ctx, size, WORLD_WIDTH, WORLD_HEIGHT, '#14181c');
  ctx.fillStyle = '#181d22';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const load = siteLoad(state);
  const overloaded = load > SITE_CAPACITY;
  worldText(ctx, view, `Load ${load} / ${SITE_CAPACITY}`, 0.3, 0.55, {
    size: 0.42,
    color: overloaded ? '#ff8787' : 'white',
  });
  worldText(ctx, view, 'Breaker', 4.3, 0.55, { size: 0.32, color: '#adb5bd' });
  drawBar(ctx, 5.7, 0.42, 4, 0.26, state.heat, state.heat > 0.66 ? '#ff6b6b' : '#fcc419');

  const strikes = '●'.repeat(state.strikes) + '○'.repeat(Math.max(0, MAX_STRIKES - state.strikes));
  worldText(ctx, view, strikes, 11.9, 0.55, { size: 0.36, color: '#ff8787', align: 'right' });
  worldText(ctx, view, `Score ${state.score}`, WORLD_WIDTH - 0.3, 0.55, {
    size: 0.42,
    color: 'white',
    align: 'right',
  });

  for (let index = 0; index < STALLS; index += 1) drawStall(ctx, view, state, index);

  if (state.tripped > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    worldText(ctx, view, 'Breaker tripped', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 0.3, {
      size: 0.7,
      color: '#ff8787',
      align: 'center',
      weight: 700,
    });
    worldText(
      ctx,
      view,
      `Back in ${Math.ceil(state.tripped)}`,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2 + 0.5,
      { size: 0.42, color: 'white', align: 'center' },
    );
  }
  ctx.restore();
};
