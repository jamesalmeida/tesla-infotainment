import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDismiss } from '../../../hooks/useDismiss';
import { getImagePath } from '../../../utils/assetPaths';
import { searchSettings, type SettingEntry } from './settingsIndex';
import styles from './CarSettings.module.css';

export function SettingsSearch({ onPick }: { onPick: (entry: SettingEntry) => void }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = searchSettings(query);
  const showsList = isOpen && query.trim() !== '';

  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(rootRef, showsList, close);

  const pick = (entry: SettingEntry) => {
    onPick(entry);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((activeIndex + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      pick(results[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className={`${styles['top-bar-item']} ${styles['search-bar']}`}>
      <img src={getImagePath('icon-search.svg')} alt="" />
      <input
        type="search"
        placeholder="Search settings"
        aria-label="Search settings"
        role="combobox"
        aria-expanded={showsList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showsList && results.length ? `${listId}-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showsList && (
        <ul id={listId} className={styles['search-results']} role="listbox">
          {results.map((entry, index) => (
            <li
              key={entry.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? styles['search-result-active'] : ''}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => pick(entry)}
            >
              <span>{entry.label}</span>
              <span className={styles['search-result-path']}>{entry.panel}</span>
            </li>
          ))}
          {!results.length && <li className={styles['search-empty']}>No matching settings</li>}
        </ul>
      )}
    </div>
  );
}
