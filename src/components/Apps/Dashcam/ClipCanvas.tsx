import { useEffect, useRef } from 'react';
import { CAMERA_LABEL, type Camera, type Clip } from './clips';
import { drawFrame, sceneAt, type SceneColors } from './scene';
import styles from './Dashcam.module.css';

// Canvas can't read CSS variables by name, so the theme is looked up for each draw.
function readColors(canvas: HTMLCanvasElement): SceneColors {
  const style = getComputedStyle(canvas);
  const token = (name: string) => style.getPropertyValue(`--color-${name}`).trim();
  return {
    sky: token('card-hover'),
    ground: token('panel'),
    road: token('border'),
    marking: token('card'),
    roadside: token('success'),
    vehicle: token('text-muted'),
    taillight: token('danger'),
    person: token('text-strong'),
  };
}

interface ClipCanvasProps {
  clip: Clip;
  camera: Camera;
  seconds: number;
}

// One camera's view, drawn for the given moment of the clip. There is no footage behind it.
export function ClipCanvas({ clip, camera, seconds }: ClipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latestRef = useRef({ clip, camera, seconds });

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { clip: currentClip, camera: currentCamera, seconds: currentSeconds } = latestRef.current;
    const scale = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * scale)) canvas.width = Math.round(width * scale);
    if (canvas.height !== Math.round(height * scale)) canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawFrame(
      ctx,
      width,
      height,
      readColors(canvas),
      sceneAt(currentClip, currentCamera, currentSeconds),
      currentCamera,
    );
  };
  const drawRef = useRef(draw);

  useEffect(() => {
    latestRef.current = { clip, camera, seconds };
    drawRef.current = draw;
    draw();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      role="img"
      aria-label={`${CAMERA_LABEL[camera]} camera, simulated`}
    />
  );
}
