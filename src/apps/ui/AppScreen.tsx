import type { ReactNode } from 'react';
import ui from './AppScreen.module.css';

interface AppScreenProps {
  title: string;
  // Sits beside the title: tabs, date controls and so on.
  toolbar?: ReactNode;
  children: ReactNode;
  // Set for screens that lay out their own scrolling, such as a canvas or a player.
  fixed?: boolean;
}

// The frame every app shares, so sizing, theming and scrolling only exist once.
export function AppScreen({ title, toolbar, children, fixed = false }: AppScreenProps) {
  return (
    <section className={ui.screen} aria-label={title}>
      <header className={ui.header}>
        <h2 className={ui.title}>{title}</h2>
        {toolbar && <div className={ui.toolbar}>{toolbar}</div>}
      </header>
      <div className={fixed ? ui.fixedBody : ui.body}>{children}</div>
    </section>
  );
}

export interface TabOption<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: readonly TabOption<T>[];
  value: T;
  onChange: (tab: T) => void;
  label: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  return (
    <div className={ui.tabs} role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          className={`${ui.tab} ${tab.id === value ? ui.tabActive : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface CalloutProps {
  tone?: 'info' | 'warning' | 'error';
  children: ReactNode;
  action?: ReactNode;
}

// The visible message for anything blocked, offline, empty or only simulated.
export function Callout({ tone = 'info', children, action }: CalloutProps) {
  return (
    <div className={`${ui.callout} ${ui[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className={ui.calloutText}>{children}</div>
      {action}
    </div>
  );
}

export { ui };
