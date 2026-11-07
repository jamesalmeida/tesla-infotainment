import { useId, useState, type ReactNode } from 'react';
import styles from './SettingsKit.module.css';

interface RowProps {
  // Where search lands. See settingsIndex.ts.
  setting: string;
  label: string;
  description?: ReactNode;
  // Longer help, behind an information button.
  info?: string;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function RowText({
  label,
  htmlFor,
  labelId,
  description,
  info,
}: Pick<RowProps, 'label' | 'description' | 'info'> & { htmlFor?: string; labelId?: string }) {
  const [showsInfo, setShowsInfo] = useState(false);

  return (
    <div className={styles.text}>
      <div className={styles.labelLine}>
        <label id={labelId} htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {info && (
          <button
            type="button"
            className={styles.infoButton}
            aria-label={`About ${label}`}
            aria-expanded={showsInfo}
            onClick={() => setShowsInfo(!showsInfo)}
          >
            <span className={styles.infoGlyph}>i</span>
          </button>
        )}
      </div>
      {description && <p className={styles.description}>{description}</p>}
      {showsInfo && <p className={styles.description}>{info}</p>}
    </div>
  );
}

export function Toggle({
  setting,
  label,
  description,
  info,
  checked,
  onChange,
}: RowProps & { checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();

  return (
    <div className={styles.row} data-setting={setting}>
      <RowText label={label} htmlFor={id} description={description} info={info} />
      <input
        id={id}
        className={styles.switch}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

export interface Choice<T> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  setting,
  label,
  description,
  info,
  value,
  options,
  onChange,
}: RowProps & { value: T; options: readonly Choice<T>[]; onChange: (value: T) => void }) {
  const labelId = useId();

  return (
    <div className={`${styles.row} ${styles.stackable}`} data-setting={setting}>
      <RowText label={label} labelId={labelId} description={description} info={info} />
      <div className={styles.segments} role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.segment} ${option.value === value ? styles.selected : ''}`}
          >
            <input
              type="radio"
              name={labelId}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function Slider({
  setting,
  label,
  description,
  info,
  value,
  min,
  max,
  step = 1,
  disabled,
  valueLabel,
  onChange,
}: RowProps & {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div className={`${styles.row} ${styles.sliderRow}`} data-setting={setting}>
      <div className={styles.sliderHeader}>
        <RowText label={label} htmlFor={id} description={description} info={info} />
        <output htmlFor={id} className={styles.value}>
          {valueLabel}
        </output>
      </div>
      <input
        id={id}
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

// A row whose control isn't a value, such as a status with buttons beside it.
export function ActionRow({
  setting,
  label,
  description,
  info,
  inline,
  children,
}: RowProps & { inline?: boolean; children?: ReactNode }) {
  return (
    <div className={`${styles.row} ${inline ? '' : styles.stackable}`} data-setting={setting}>
      <RowText label={label} description={description} info={info} />
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${primary ? styles.primary : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className={styles.stats}>
      {items.map(({ label, value }) => (
        <div key={label} className={styles.stat}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Note({ children, warning }: { children: ReactNode; warning?: boolean }) {
  return <p className={`${styles.note} ${warning ? styles.warning : ''}`}>{children}</p>;
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}
