import { useEffect, useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { applyKey, OnScreenKeyboard } from './OnScreenKeyboard';

test.each([
  ['abc', 3, 'd', false, { value: 'abcd', caret: 4 }],
  ['abc', 1, 'd', false, { value: 'adbc', caret: 2 }],
  ['abc', 3, 'x', true, { value: 'abcX', caret: 4 }],
  ['abc', 2, 'backspace', false, { value: 'ac', caret: 1 }],
  ['abc', 3, 'space', false, { value: 'abc ', caret: 4 }],
  ['', 0, 'backspace', false, null],
])('applyKey(%s, %i, %s) -> %j', (value, caret, key, shift, expected) => {
  expect(applyKey(value, caret, key, shift)).toEqual(expected);
});

function Harness() {
  const [value, setValue] = useState('');
  const [target, setTarget] = useState<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTarget(inputRef.current), []);

  return (
    <>
      <input
        ref={inputRef}
        aria-label="field"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <OnScreenKeyboard target={target} onClose={() => setTarget(null)} />
    </>
  );
}

test('the keyboard types into the focused field', () => {
  render(<Harness />);
  const field = screen.getByLabelText('field') as HTMLInputElement;

  fireEvent.click(screen.getByRole('button', { name: 'h' }));
  fireEvent.click(screen.getByRole('button', { name: 'i' }));
  fireEvent.click(screen.getByRole('button', { name: 'Space' }));
  fireEvent.click(screen.getByRole('button', { name: 'Backspace' }));

  expect(field.value).toBe('hi');
});

test('shift types a capital and resets afterwards', () => {
  render(<Harness />);
  const field = screen.getByLabelText('field') as HTMLInputElement;

  fireEvent.click(screen.getByRole('button', { name: 'Shift' }));
  fireEvent.click(screen.getByRole('button', { name: 'H' }));
  fireEvent.click(screen.getByRole('button', { name: 'i' }));

  expect(field.value).toBe('Hi');
});

test('Done closes the keyboard', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('group', { name: 'On-screen keyboard' })).not.toBeInTheDocument();
});
