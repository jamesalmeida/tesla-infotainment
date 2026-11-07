import { useId, useState, type FormEvent, type ReactNode } from 'react';
import styles from './SystemPanel.module.css';

export { styles as panelStyles };

const MAX_PIN_LENGTH = 4;

// The pieces every system panel is built from, so they share one look and one set of sizes.
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </div>
  );
}

export function Section({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
    </section>
  );
}

// Says out loud that nothing here is real.
export function DemoNote({ children }: { children: ReactNode }) {
  return <p className={styles.demoNote}>{children}</p>;
}

export function Row({
  label,
  hint,
  labelId,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  labelId?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span id={labelId} className={styles.rowLabel}>
          {label}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      {children && <div className={styles.rowControl}>{children}</div>}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();

  return (
    <Row label={label} hint={hint} labelId={labelId}>
      <button
        type="button"
        role="switch"
        className={styles.switch}
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchThumb} />
      </button>
    </Row>
  );
}

export function Choice<T extends string | number>({
  label,
  hint,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  options: readonly { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const labelId = useId();

  return (
    <div className={styles.stackedRow}>
      <div className={styles.rowText}>
        <span id={labelId} className={styles.rowLabel}>
          {label}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <div className={styles.segmented} role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            className={styles.segment}
            aria-checked={option.value === value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  disabled,
  format = String,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.stackedRow}>
      <div className={styles.sliderHeader}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.sliderValue}>{format(value)}</span>
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
      <input
        className={styles.slider}
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <dl className={styles.stats}>{children}</dl>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}

export function Button({
  children,
  variant = 'default',
  type = 'button',
  disabled,
  label,
  onPress,
}: {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  // For buttons whose text alone doesn't say what they act on.
  label?: string;
  onPress?: () => void;
}) {
  return (
    <button
      type={type}
      className={`${styles.button} ${variant === 'default' ? '' : styles[variant]}`}
      disabled={disabled}
      aria-label={label}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.buttonRow}>{children}</div>;
}

export function ProgressBar({ label, percent }: { label: string; percent: number }) {
  const value = Math.round(percent);

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}

// One text box and a button: naming a meter, a driver or the car.
export function NameForm({
  label,
  submitLabel,
  initialValue = '',
  maxLength,
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  initialValue?: string;
  maxLength: number;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialValue);
  const isEmpty = name.trim() === '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEmpty) return;
    onSubmit(name.trim());
    setName('');
  };

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        aria-label={label}
        placeholder={label}
        autoComplete="off"
        value={name}
        maxLength={maxLength}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" variant="primary" disabled={isEmpty}>
        {submitLabel}
      </Button>
      {onCancel && <Button onPress={onCancel}>Cancel</Button>}
    </form>
  );
}

export function PinForm({
  label,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState('');
  const isComplete = pin.length === MAX_PIN_LENGTH;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isComplete) return;
    onSubmit(pin);
    setPin('');
  };

  return (
    <form className={styles.inlineForm} onSubmit={handleSubmit}>
      <input
        className={`${styles.input} ${styles.pinInput}`}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        aria-label={label}
        placeholder="4-digit PIN"
        value={pin}
        maxLength={MAX_PIN_LENGTH}
        onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
      />
      <Button type="submit" variant="primary" disabled={!isComplete}>
        {submitLabel}
      </Button>
      {onCancel && <Button onPress={onCancel}>Cancel</Button>}
    </form>
  );
}
