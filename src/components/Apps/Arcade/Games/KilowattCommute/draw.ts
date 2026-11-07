import { drawBolt, drawCar, enterWorld, worldText } from '../canvasWorld';
import type { Size } from '../runtime';
import {
  CAR_LENGTH,
  LANES,
  LANE_HEIGHT,
  PLAYER_X,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  entityLength,
  type Entity,
  type KilowattState,
} from './rules';

const TRAFFIC_COLORS = ['#e8590c', '#5c7cfa', '#868e96', '#d6336c', '#f2c94c'];
const DASH = 1.6;
const DASH_GAP = 1.4;

const isPad = (entity: Entity) => entity.kind === 'pad';
const laneCenter = (lane: number) => (lane + 0.5) * LANE_HEIGHT;

const drawRoad = (ctx: CanvasRenderingContext2D, scroll: number) => {
  ctx.fillStyle = '#2b3036';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.fillStyle = '#e9ecef';
  ctx.fillRect(0, 0, WORLD_WIDTH, 0.08);
  ctx.fillRect(0, WORLD_HEIGHT - 0.08, WORLD_WIDTH, 0.08);

  const period = DASH + DASH_GAP;
  const start = -(scroll % period);
  ctx.fillStyle = 'rgba(233, 236, 239, 0.65)';
  for (let lane = 1; lane < LANES; lane += 1) {
    for (let x = start; x < WORLD_WIDTH; x += period) {
      ctx.fillRect(x, lane * LANE_HEIGHT - 0.03, DASH, 0.06);
    }
  }
};

const drawTruck = (ctx: CanvasRenderingContext2D, color: string) => {
  const length = entityLength('truck');
  const width = 1;
  ctx.fillStyle = '#ced4da';
  ctx.fillRect(-length / 2, -width / 2, length * 0.72, width);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(length * 0.24, -width / 2, length * 0.26, width, 0.14);
  ctx.fill();
};

const drawEntity = (ctx: CanvasRenderingContext2D, entity: Entity) => {
  const color = TRAFFIC_COLORS[entity.id % TRAFFIC_COLORS.length];
  ctx.save();
  ctx.translate(entity.x, laneCenter(entity.lane));
  if (entity.kind === 'pad') {
    ctx.fillStyle = 'rgba(64, 192, 87, 0.28)';
    ctx.strokeStyle = '#69db7c';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.roundRect(-0.55, -0.55, 1.1, 1.1, 0.16);
    ctx.fill();
    ctx.stroke();
    drawBolt(ctx, 0.85, '#69db7c');
  } else if (entity.kind === 'truck') {
    drawTruck(ctx, color);
  } else {
    drawCar(ctx, CAR_LENGTH, 0.95, color);
  }
  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, state: KilowattState) => {
  // Blink through the grace period after a crash.
  if (state.grace > 0 && Math.floor(state.grace * 10) % 2 === 0) return;

  ctx.save();
  ctx.translate(PLAYER_X, laneCenter(state.laneY));
  if (state.mode === 'boost') {
    ctx.fillStyle = 'rgba(116, 192, 252, 0.7)';
    ctx.fillRect(-CAR_LENGTH / 2 - 0.7, -0.3, 0.7, 0.6);
  }
  drawCar(ctx, CAR_LENGTH, 0.95, '#f1f3f5');
  if (state.mode === 'regen') {
    drawBolt(ctx, 0.6, '#51cf66');
  }
  ctx.restore();
};

const chargeColor = (charge: number) => {
  if (charge < 20) return '#ff6b6b';
  return charge < 45 ? '#fcc419' : '#51cf66';
};

const HUD_HEIGHT = 1;

export const draw = (ctx: CanvasRenderingContext2D, state: KilowattState, size: Size): void => {
  ctx.save();
  const view = enterWorld(ctx, size, WORLD_WIDTH, WORLD_HEIGHT + HUD_HEIGHT, '#14181c');

  // The dash above the road: battery gauge and trip meter.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(0.3, 0.32, 6, 0.36);
  ctx.fillStyle = chargeColor(state.charge);
  ctx.fillRect(0.3, 0.32, 6 * (state.charge / 100), 0.36);
  worldText(ctx, view, `${Math.ceil(state.charge)}%`, 6.5, 0.5, { size: 0.42, color: 'white' });
  worldText(ctx, view, `${state.distance.toFixed(1)} km`, WORLD_WIDTH - 0.3, 0.5, {
    size: 0.46,
    color: 'white',
    align: 'right',
  });

  ctx.translate(0, HUD_HEIGHT);
  drawRoad(ctx, state.roadScroll);
  // Pads are painted on the road, so vehicles drive over them.
  state.entities.filter(isPad).forEach((entity) => drawEntity(ctx, entity));
  state.entities.filter((entity) => !isPad(entity)).forEach((entity) => drawEntity(ctx, entity));
  drawPlayer(ctx, state);
  ctx.restore();
};
