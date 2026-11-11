import { drawBolt, drawCar, enterWorld, worldText } from '../canvasWorld';
import type { Size } from '../runtime';
import { LEVELS, type Box, type Level, type Obstacle } from './levels';
import {
  CAR_LENGTH,
  CAR_WIDTH,
  MAX_SCUFFS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  isInBay,
  type CurbState,
} from './rules';

const PARKED_COLORS = ['#868e96', '#e8590c', '#5c7cfa', '#d6336c'];

const inBox = (ctx: CanvasRenderingContext2D, box: Box, drawBox: () => void) => {
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.rotate(box.heading);
  drawBox();
  ctx.restore();
};

const drawBay = (ctx: CanvasRenderingContext2D, bay: Box, isReady: boolean) => {
  inBox(ctx, bay, () => {
    ctx.fillStyle = isReady ? 'rgba(81, 207, 102, 0.3)' : 'rgba(116, 192, 252, 0.16)';
    ctx.fillRect(-bay.length / 2, -bay.width / 2, bay.length, bay.width);
    ctx.strokeStyle = isReady ? '#51cf66' : '#74c0fc';
    ctx.lineWidth = 0.07;
    ctx.strokeRect(-bay.length / 2, -bay.width / 2, bay.length, bay.width);

    // The arrow shows which way the car must face.
    ctx.fillStyle = isReady ? '#51cf66' : 'rgba(116, 192, 252, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0.55, 0);
    ctx.lineTo(0, -0.34);
    ctx.lineTo(0, -0.13);
    ctx.lineTo(-0.5, -0.13);
    ctx.lineTo(-0.5, 0.13);
    ctx.lineTo(0, 0.13);
    ctx.lineTo(0, 0.34);
    ctx.closePath();
    ctx.fill();

    // The charging post sits behind the car, by its charge port.
    ctx.save();
    ctx.translate(-bay.length / 2 + 0.05, 0);
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.arc(0, 0, 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-bay.heading);
    drawBolt(ctx, 0.36, '#ffd43b');
    ctx.restore();
  });
};

const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle, index: number) => {
  inBox(ctx, obstacle, () => {
    const { length, width, kind } = obstacle;
    if (kind === 'car') {
      drawCar(ctx, length, width, PARKED_COLORS[index % PARKED_COLORS.length]);
      return;
    }
    ctx.fillStyle = kind === 'pillar' ? '#adb5bd' : '#868e96';
    ctx.fillRect(-length / 2, -width / 2, length, width);
    ctx.strokeStyle = '#fcc419';
    ctx.lineWidth = 0.06;
    ctx.strokeRect(-length / 2, -width / 2, length, width);
  });
};

const drawLot = (ctx: CanvasRenderingContext2D, level: Level) => {
  ctx.fillStyle = '#343a40';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.strokeStyle = '#fcc419';
  ctx.lineWidth = 0.14;
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  level.obstacles.forEach((obstacle, index) => drawObstacle(ctx, obstacle, index));
};

export const draw = (ctx: CanvasRenderingContext2D, state: CurbState, size: Size): void => {
  const level = LEVELS[state.level];
  ctx.save();
  const view = enterWorld(ctx, size, WORLD_WIDTH, WORLD_HEIGHT, '#1f2327');
  drawLot(ctx, level);
  drawBay(ctx, level.bay, isInBay(state.car, level.bay));

  inBox(ctx, { ...state.car, length: CAR_LENGTH, width: CAR_WIDTH }, () => {
    drawCar(ctx, CAR_LENGTH, CAR_WIDTH, state.scuffGrace > 0 ? '#ff8787' : '#f1f3f5');
  });

  const bottom = WORLD_HEIGHT - 0.42;
  worldText(ctx, view, `${state.level + 1}/${LEVELS.length} ${level.name}`, 0.35, bottom, {
    size: 0.42,
    color: 'white',
  });
  worldText(
    ctx,
    view,
    `Scuffs ${state.scuffs}/${MAX_SCUFFS}   Score ${state.score}`,
    WORLD_WIDTH - 0.35,
    bottom,
    { size: 0.42, color: 'white', align: 'right' },
  );

  if (state.celebrating > 0) {
    worldText(ctx, view, 'Parked!', WORLD_WIDTH / 2, WORLD_HEIGHT / 2, {
      size: 1.2,
      color: '#51cf66',
      align: 'center',
      weight: 700,
    });
  }
  ctx.restore();
};
