import { sceneSpeed, type Camera, type Clip } from './clips';

export interface SceneColors {
  sky: string;
  ground: string;
  road: string;
  marking: string;
  roadside: string;
  vehicle: string;
  taillight: string;
  person: string;
  // Mid-grey in both themes, so multiplying by it always darkens.
  dusk: string;
}

export interface SceneFrame {
  // 0 to 1: how far the road markings have scrolled.
  laneOffset: number;
  // Positions of passing roadside posts, 0 at the horizon or far edge and 1 nearest.
  posts: number[];
  // Another car's distance, 0 far to 1 close, or null when none is in view.
  vehicle: number | null;
  // Where someone walking past is, 0 to 1 across the frame, or null.
  person: number | null;
  isNight: boolean;
}

const POST_COUNT = 5;
const WALK_SECONDS = 12;
const CAMERA_PHASE: Record<Camera, number> = { front: 0, rear: 0.37, left: 0.61, right: 0.83 };

const fraction = (value: number) => value - Math.floor(value);

// Everything about a frame comes from the clip, camera and time, so scrubbing is exact.
export function sceneAt(clip: Clip, camera: Camera, seconds: number): SceneFrame {
  const speed = sceneSpeed(clip.scene);
  const phase = CAMERA_PHASE[camera];
  // The rear camera sees the road run away from it.
  const direction = camera === 'rear' ? -1 : 1;
  const travel = (speed / 30) * seconds * direction;

  const posts =
    speed === 0
      ? [0.3, 0.75]
      : Array.from({ length: POST_COUNT }, (_, index) =>
          fraction(travel * 0.35 + index / POST_COUNT + phase),
        );

  const vehiclePhase = fraction(seconds / 17 + phase);
  const walking = fraction((seconds + phase * 4) / WALK_SECONDS);

  return {
    laneOffset: fraction(travel),
    posts,
    vehicle: speed > 0 && vehiclePhase < 0.6 ? vehiclePhase / 0.6 : null,
    person: speed === 0 && walking < 0.8 ? walking / 0.8 : null,
    isNight: clip.scene === 'night',
  };
}

function drawRoadAhead(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: SceneColors,
  frame: SceneFrame,
) {
  const horizon = height * 0.42;
  const centre = width / 2;

  ctx.fillStyle = colors.road;
  ctx.beginPath();
  ctx.moveTo(centre - width * 0.04, horizon);
  ctx.lineTo(centre + width * 0.04, horizon);
  ctx.lineTo(width * 0.98, height);
  ctx.lineTo(width * 0.02, height);
  ctx.closePath();
  ctx.fill();

  // Markings get longer and wider as they come closer.
  ctx.fillStyle = colors.marking;
  for (let dash = 0; dash < 6; dash += 1) {
    const near = ((dash + frame.laneOffset) / 6) ** 2;
    const far = ((dash + frame.laneOffset + 0.45) / 6) ** 2;
    const top = horizon + near * (height - horizon);
    const bottom = horizon + far * (height - horizon);
    const halfTop = 1 + near * width * 0.012;
    const halfBottom = 1 + far * width * 0.012;
    ctx.beginPath();
    ctx.moveTo(centre - halfTop, top);
    ctx.lineTo(centre + halfTop, top);
    ctx.lineTo(centre + halfBottom, bottom);
    ctx.lineTo(centre - halfBottom, bottom);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = colors.roadside;
  frame.posts.forEach((post, index) => {
    const depth = post ** 2;
    const y = horizon + depth * (height - horizon);
    const side = index % 2 === 0 ? -1 : 1;
    const x = centre + side * (width * 0.06 + depth * width * 0.5);
    const size = 3 + depth * height * 0.28;
    ctx.fillRect(x - size * 0.12, y - size, size * 0.24, size);
    ctx.beginPath();
    ctx.arc(x, y - size, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
  });

  if (frame.vehicle !== null) {
    const depth = 0.08 + frame.vehicle * 0.3;
    const size = width * depth * 0.5;
    const y = horizon + depth * (height - horizon) * 1.2;
    const x = centre - width * 0.03 - depth * width * 0.18;
    ctx.fillStyle = colors.vehicle;
    ctx.fillRect(x - size / 2, y - size * 0.6, size, size * 0.6);
    ctx.fillStyle = colors.taillight;
    ctx.fillRect(x - size / 2, y - size * 0.3, size * 0.2, size * 0.1);
    ctx.fillRect(x + size * 0.3, y - size * 0.3, size * 0.2, size * 0.1);
  }
}

function drawRoadside(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: SceneColors,
  frame: SceneFrame,
) {
  const kerb = height * 0.68;

  ctx.fillStyle = colors.road;
  ctx.fillRect(0, kerb, width, height - kerb);

  ctx.fillStyle = colors.marking;
  for (let dash = -1; dash < 8; dash += 1) {
    ctx.fillRect(((dash + frame.laneOffset) / 7) * width, height * 0.84, width / 16, height * 0.02);
  }

  ctx.fillStyle = colors.roadside;
  frame.posts.forEach((post) => {
    const x = post * width;
    const size = height * 0.42;
    ctx.fillRect(x - size * 0.06, kerb - size, size * 0.12, size);
    ctx.beginPath();
    ctx.arc(x, kerb - size, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: SceneColors,
  frame: SceneFrame,
  camera: Camera,
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = colors.sky;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = colors.ground;
  ctx.fillRect(0, height * 0.42, width, height * 0.58);

  if (camera === 'front' || camera === 'rear') drawRoadAhead(ctx, width, height, colors, frame);
  else drawRoadside(ctx, width, height, colors, frame);

  if (frame.person !== null) {
    const size = height * 0.34;
    const x = frame.person * width;
    const y = height * 0.82;
    ctx.fillStyle = colors.person;
    ctx.fillRect(x - size * 0.11, y - size * 0.72, size * 0.22, size * 0.72);
    ctx.beginPath();
    ctx.arc(x, y - size * 0.86, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  if (frame.isNight) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = colors.dusk;
    ctx.fillRect(0, 0, width, height);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
