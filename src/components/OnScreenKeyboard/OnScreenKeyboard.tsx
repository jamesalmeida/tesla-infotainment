import { useState } from 'react';
import styles from './OnScreenKeyboard.module.css';

export const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const;

export interface EditResult {
  value: string;
  caret: number;
}

// Inserts at the caret, so the on-screen keyboard behaves like the real one.
export function applyKey(
  value: string,
  caret: number,
  key: string,
  shift: boolean,
): EditResult | null {
  const at = Math.max(0, Math.min(value.length, caret));
  if (key === 'backspace') {
    if (at === 0) return null;
    return { value: value.slice(0, at - 1) + value.slice(at), caret: at - 1 };
  }
  if (key === 'space') {
    return { value: `${value.slice(0, at)} ${value.slice(at)}`, caret: at + 1 };
  }
  if (key.length !== 1) return null;
  const character = shift ? key.toUpperCase() : key;
  return { value: value.slice(0, at) + character + value.slice(at), caret: at + 1 };
}

const setNativeValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(prototype.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

interface OnScreenKeyboardProps {
  target: HTMLInputElement | HTMLTextAreaElement | null;
  onClose: () => void;
}

export function OnScreenKeyboard({ target, onClose }: OnScreenKeyboardProps) {
  const [shift, setShift] = useState(false);
  if (!target) return null;

  const type = (key: string) => {
    const result = applyKey(target.value, target.selectionStart ?? target.value.length, key, shift);
    if (!result) return;
    setNativeValue(target, result.value);
    target.setSelectionRange(result.caret, result.caret);
    if (shift && key.length === 1) setShift(false);
  };

  const submit = () => {
    const form = target.form;
    if (form) form.requestSubmit();
    else target.blur();
  };

  return (
    <div className={styles.keyboard} role="group" aria-label="On-screen keyboard">
      <div className={styles.heading}>
        <span>On-screen keyboard</span>
        <button type="button" className={styles.done} onClick={onClose}>
          Done
        </button>
      </div>
      {KEY_ROWS.map((row, index) => (
        <div key={index} className={styles.row}>
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className={styles.key}
              aria-label={shift ? key.toUpperCase() : key}
              onClick={() => type(key)}
            >
              {shift ? key.toUpperCase() : key}
            </button>
          ))}
        </div>
      ))}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.key} ${styles.wide}`}
          aria-pressed={shift}
          onClick={() => setShift((on) => !on)}
        >
          Shift
        </button>
        <button type="button" className={styles.key} onClick={() => type('space')}>
          Space
        </button>
        <button
          type="button"
          className={`${styles.key} ${styles.wide}`}
          aria-label="Backspace"
          onClick={() => type('backspace')}
        >
          ⌫
        </button>
        <button type="button" className={`${styles.key} ${styles.enter}`} onClick={submit}>
          Enter
        </button>
      </div>
    </div>
  );
}
