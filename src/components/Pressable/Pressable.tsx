import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';

interface PressableProps extends HTMLAttributes<HTMLDivElement> {
  onPress: () => void;
  // Set for toggles, so assistive tech announces on or off.
  pressed?: boolean;
  children: ReactNode;
}

// A div that behaves like a button, for layouts whose CSS is built around divs.
export function Pressable({ onPress, pressed, children, ...rest }: PressableProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPress();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      onClick={onPress}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}
