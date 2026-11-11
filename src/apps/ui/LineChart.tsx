import { useRef, useState, type PointerEvent } from 'react';
import styles from './LineChart.module.css';

export interface ChartPoint {
  x: number;
  y: number;
}

interface LineChartProps {
  points: ChartPoint[];
  // Says what the chart shows, for assistive tech and as the caption above it.
  title: string;
  formatX: (x: number) => string;
  formatY: (y: number) => string;
  // Keep a meaningful baseline rather than letting small changes fill the chart.
  minY?: number;
}

const WIDTH = 600;
const HEIGHT = 200;

const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
};

export function pathFor(points: ChartPoint[], minY: number, maxY: number): string {
  if (points.length === 0) return '';
  const minX = points[0].x;
  const spanX = points[points.length - 1].x - minX || 1;
  const spanY = maxY - minY || 1;
  return points
    .map(({ x, y }, index) => {
      const px = ((x - minX) / spanX) * WIDTH;
      const py = HEIGHT - ((y - minY) / spanY) * HEIGHT;
      return `${index === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
}

// One series, with a crosshair that reads out the nearest point.
export function LineChart({ points, title, formatX, formatY, minY = 0 }: LineChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const maxY = niceMax(Math.max(...points.map((point) => point.y), minY + 1));
  const first = points[0];
  const last = points[points.length - 1];
  const spanX = (last?.x ?? 0) - (first?.x ?? 0) || 1;

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || !box.width || points.length === 0) return;
    const target = first.x + ((event.clientX - box.left) / box.width) * spanX;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(point.x - target) < Math.abs(points[nearest].x - target)) nearest = index;
    });
    setHovered(nearest);
  };

  const active = hovered === null ? null : points[hovered];
  const activeLeft = active && first ? ((active.x - first.x) / spanX) * 100 : 0;

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <div className={styles.frame}>
        <div className={styles.yAxis} aria-hidden="true">
          <span>{formatY(maxY)}</span>
          <span>{formatY(minY)}</span>
        </div>
        <div
          ref={plotRef}
          className={styles.plot}
          onPointerDown={track}
          onPointerMove={track}
          onPointerLeave={() => setHovered(null)}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={
              last
                ? `${title}. Latest ${formatY(last.y)} at ${formatX(last.x)}.`
                : `${title}. No data yet.`
            }
          >
            <line className={styles.grid} x1="0" x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} />
            <line className={styles.baseline} x1="0" x2={WIDTH} y1={HEIGHT} y2={HEIGHT} />
            <path className={styles.line} d={pathFor(points, minY, maxY)} />
          </svg>
          {active && (
            <>
              <div className={styles.crosshair} style={{ left: `${activeLeft}%` }} />
              <div
                className={`${styles.tooltip} ${activeLeft > 60 ? styles.tooltipLeft : ''}`}
                style={{ left: `${activeLeft}%` }}
              >
                <strong>{formatY(active.y)}</strong>
                <span>{formatX(active.x)}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={styles.xAxis} aria-hidden="true">
        <span>{first ? formatX(first.x) : ''}</span>
        <span>{last ? formatX(last.x) : ''}</span>
      </div>
    </figure>
  );
}
