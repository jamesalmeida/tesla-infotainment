import styles from './GeneratedArt.module.css';

// Stable across visits, so a show keeps the same cover every time.
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const HUES = [
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
];

const ARCS = [14, 26, 38, 50];
const BARS = [0, 1, 2, 3, 4, 5];

interface GeneratedArtProps {
  seed: string;
  // Omit when the title beside the art already says what it is.
  label?: string;
  className?: string;
}

// Cover art drawn from the title, so nothing is hotlinked and it follows the theme.
export function GeneratedArt({ seed, label, className = '' }: GeneratedArtProps) {
  const hash = hashSeed(seed);
  const main = HUES[hash % HUES.length];
  const second = HUES[(hash >>> 3) % HUES.length];
  const pattern = (hash >>> 6) % 3;
  const cx = 20 + ((hash >>> 9) % 60);

  return (
    <svg
      className={`${styles.art} ${className}`}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ background: 'var(--color-panel)' }}
    >
      {pattern === 0 &&
        ARCS.map((radius, index) => (
          <circle
            key={radius}
            cx={cx}
            cy={100}
            r={radius * 1.6}
            style={{
              fill: 'none',
              stroke: index % 2 ? second : main,
              strokeWidth: 7,
              opacity: 1 - index * 0.15,
            }}
          />
        ))}
      {pattern === 1 &&
        BARS.map((bar) => {
          const height = 22 + ((hash >>> (bar * 3)) % 60);
          return (
            <rect
              key={bar}
              x={8 + bar * 15}
              y={92 - height}
              width={10}
              height={height}
              rx={3}
              style={{ fill: bar % 2 ? second : main }}
            />
          );
        })}
      {pattern === 2 && (
        <>
          <circle cx={cx} cy={38} r={26} style={{ fill: main }} />
          <path d="M0 72 Q 25 48 50 70 T 100 66 V 100 H 0 Z" style={{ fill: second }} />
        </>
      )}
    </svg>
  );
}
