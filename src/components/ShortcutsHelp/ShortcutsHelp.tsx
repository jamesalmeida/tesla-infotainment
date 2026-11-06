import { SHORTCUTS, type ShortcutGroup } from '../../hooks/shortcuts';
import styles from './ShortcutsHelp.module.css';

const GROUPS: ShortcutGroup[] = ['Gears', 'Driving', 'Display'];

export function ShortcutsHelp() {
  return (
    <div className={styles.shortcutsHelp}>
      <h2>Keyboard shortcuts</h2>
      <div className={styles.groups}>
        {GROUPS.map((group) => (
          <section key={group}>
            <h3>{group}</h3>
            <dl>
              {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                <div key={shortcut.label}>
                  <dt>{shortcut.label}</dt>
                  <dd>{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
