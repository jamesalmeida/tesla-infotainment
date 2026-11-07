import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Callout, ui } from '../../../../apps/ui/AppScreen';
import {
  BRUSH_SIZES,
  INK_TOKENS,
  sketchFileName,
  strokeSegments,
  undoStroke,
  type Point,
  type Stroke,
} from './sketch';
import styles from './Sketchpad.module.css';

const readToken = (element: Element, token: string) =>
  getComputedStyle(element).getPropertyValue(token).trim();

function paint(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.fillStyle = readToken(canvas, '--color-card');
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.forEach((stroke) => {
    ctx.strokeStyle = readToken(canvas, stroke.token);
    // Strokes are stored as fractions of the canvas, so a resize never distorts them.
    ctx.lineWidth = stroke.size * (width / 600);
    strokeSegments(stroke).forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from.x * width, from.y * height);
      ctx.lineTo(to.x * width, to.y * height);
      ctx.stroke();
    });
  });
}

export function Sketchpad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [token, setToken] = useState<string>(INK_TOKENS[0].token);
  const [size, setSize] = useState<number>(BRUSH_SIZES[1]);
  const [message, setMessage] = useState<string | null>(null);
  const activeRef = useRef<Stroke | null>(null);
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
    if (canvasRef.current) paint(canvasRef.current, strokes);
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * scale);
      canvas.height = Math.round(canvas.clientHeight * scale);
      paint(canvas, strokesRef.current);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const pointFrom = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / (box.width || 1),
      y: (event.clientY - box.top) / (box.height || 1),
    };
  };

  const handleDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeRef.current = { token, size, points: [pointFrom(event)] };
    setStrokes((current) => [...current, activeRef.current as Stroke]);
  };

  const handleMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current;
    if (!active) return;
    const next = { ...active, points: [...active.points, pointFrom(event)] };
    activeRef.current = next;
    setStrokes((current) => [...current.slice(0, -1), next]);
  };

  const handleUp = () => {
    activeRef.current = null;
  };

  // A download is the most portable way to share an image: it needs no account or server.
  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setMessage('This browser could not create the image.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sketchFileName(new Date());
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Saved ${link.download} to your downloads.`);
    }, 'image/png');
  };

  return (
    <div className={styles.sketchpad}>
      <div className={styles.tools}>
        <div className={styles.inks} role="radiogroup" aria-label="Ink colour">
          {INK_TOKENS.map((ink) => (
            <button
              key={ink.token}
              type="button"
              role="radio"
              aria-checked={ink.token === token}
              aria-label={ink.label}
              className={`${styles.ink} ${ink.token === token ? styles.inkActive : ''}`}
              style={{ backgroundColor: `var(${ink.token})` }}
              onClick={() => setToken(ink.token)}
            />
          ))}
        </div>
        <div className={ui.inline} role="radiogroup" aria-label="Brush size">
          {BRUSH_SIZES.map((brush, index) => (
            <button
              key={brush}
              type="button"
              role="radio"
              aria-checked={brush === size}
              className={`${ui.button} ${brush === size ? ui.primary : ''}`}
              onClick={() => setSize(brush)}
            >
              {['Thin', 'Medium', 'Thick'][index]}
            </button>
          ))}
        </div>
        <div className={ui.inline}>
          <button
            type="button"
            className={ui.button}
            disabled={strokes.length === 0}
            onClick={() => setStrokes(undoStroke)}
          >
            Undo
          </button>
          <button
            type="button"
            className={ui.button}
            disabled={strokes.length === 0}
            onClick={() => setStrokes([])}
          >
            Clear
          </button>
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            disabled={strokes.length === 0}
            onClick={save}
          >
            Save image
          </button>
        </div>
      </div>
      {message && <Callout>{message}</Callout>}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Drawing area"
        role="img"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      />
    </div>
  );
}
