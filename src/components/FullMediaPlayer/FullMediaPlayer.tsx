import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  formatMediaTime,
  playItem,
  skip,
  togglePlayback,
  useNowPlaying,
  type MediaCollection,
  type MediaItem,
  type MediaSourceId,
} from '../../apps/mediaLibrary';
import {
  allItems,
  filterShelves,
  readFavorites,
  toggleFavorite,
  writeFavorites,
} from '../../apps/mediaFavorites';
import { useMediaShelves } from '../../apps/ui/useMediaShelves';
import styles from './FullMediaPlayer.module.css';

export type PlayerTab = 'browse' | 'queue' | 'favorites' | 'search';

const TABS: { id: PlayerTab; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'queue', label: 'Queue' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'search', label: 'Search' },
];

const SOURCES: { id: MediaSourceId; label: string }[] = [
  { id: 'music', label: 'Music' },
  { id: 'podcasts', label: 'Podcasts' },
];

function ScrollingTitle({ text }: { text: string }) {
  const long = text.length > 28;
  return (
    <span className={long ? styles.scrolling : styles.title} title={text}>
      <span className={long ? styles.scrollingInner : undefined}>{text}</span>
    </span>
  );
}

function ItemRow({
  item,
  queue,
  isFavorite,
  onFavorite,
}: {
  item: MediaItem;
  queue: MediaItem[];
  isFavorite: boolean;
  onFavorite: () => void;
}) {
  const { item: current } = useNowPlaying();
  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.itemButton}
        aria-current={item.id === current?.id ? 'true' : undefined}
        onClick={() => playItem(item, queue)}
      >
        <span className={styles.itemText}>
          <ScrollingTitle text={item.title} />
          <span className={styles.subtitle}>{item.subtitle}</span>
        </span>
        <span className={styles.duration}>
          {item.durationSeconds === null ? 'Live' : formatMediaTime(item.durationSeconds)}
        </span>
      </button>
      <button
        type="button"
        className={`${styles.heart} ${isFavorite ? styles.favorite : ''}`}
        aria-label={
          isFavorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`
        }
        aria-pressed={isFavorite}
        onClick={onFavorite}
      >
        ♥
      </button>
    </li>
  );
}

export function FullMediaPlayer({
  initialTab = 'browse',
  onClose,
}: {
  initialTab?: PlayerTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PlayerTab>(initialTab);
  const [source, setSource] = useState<MediaSourceId>('music');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<MediaCollection | null>(null);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const { loaded: music, retry: retryMusic } = useMediaShelves('music');
  const { loaded: podcasts, retry: retryPodcasts } = useMediaShelves('podcasts');
  const now = useNowPlaying();

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const shelves = useMemo(() => {
    const musicShelves = music.status === 'ready' ? music.shelves : [];
    const podcastShelves = podcasts.status === 'ready' ? podcasts.shelves : [];
    return source === 'music' ? musicShelves : podcastShelves;
  }, [music, podcasts, source]);

  const everyItem = useMemo(
    () =>
      allItems([
        ...(music.status === 'ready' ? music.shelves : []),
        ...(podcasts.status === 'ready' ? podcasts.shelves : []),
      ]),
    [music, podcasts],
  );

  const favoriteItems = everyItem.filter((item) => favorites.includes(item.id));
  const results = filterShelves(shelves, query);

  const changeFavorite = (item: MediaItem) => {
    setFavorites((current) => {
      const next = toggleFavorite(current, item.id);
      writeFavorites(next);
      return next;
    });
  };

  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = TABS.findIndex((option) => option.id === tab);
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next].id);
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.player}
        role="dialog"
        aria-label="Full media player"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Media</p>
            <h1 className={styles.heading}>Player</h1>
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.nowPlaying}>
          <div className={styles.nowText}>
            {now.item ? (
              <>
                <ScrollingTitle text={now.item.title} />
                <span className={styles.subtitle}>{now.item.subtitle}</span>
              </>
            ) : (
              <span className={styles.subtitle}>Nothing is playing.</span>
            )}
          </div>
          <div className={styles.transport}>
            <button type="button" onClick={() => skip(-1)} aria-label="Previous">
              Previous
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={now.isPlaying ? 'Pause' : 'Play'}
            >
              {now.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => skip(1)} aria-label="Next">
              Next
            </button>
          </div>
        </div>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Media player sections"
          onKeyDown={handleTabKey}
        >
          {TABS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={tab === option.id}
              tabIndex={tab === option.id ? 0 : -1}
              className={tab === option.id ? styles.activeTab : ''}
              onClick={() => setTab(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {(tab === 'browse' || tab === 'search') && (
          <div className={styles.sourceTabs} role="tablist" aria-label="Media sources">
            {SOURCES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={source === option.id}
                className={source === option.id ? styles.activeSource : ''}
                onClick={() => {
                  setSource(option.id);
                  setCollection(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'search' && (
          <input
            className={styles.search}
            aria-label="Search media"
            placeholder="Search titles, shows and artists"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}

        <div className={styles.body}>
          {tab === 'queue' && (
            <ul className={styles.list}>
              {now.queue.length === 0 && <li className={styles.empty}>The queue is empty.</li>}
              {now.queue.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  queue={now.queue}
                  isFavorite={favorites.includes(item.id)}
                  onFavorite={() => changeFavorite(item)}
                />
              ))}
            </ul>
          )}

          {tab === 'favorites' && (
            <ul className={styles.list}>
              {favoriteItems.length === 0 && (
                <li className={styles.empty}>Tap a heart to keep something here.</li>
              )}
              {favoriteItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  queue={favoriteItems}
                  isFavorite
                  onFavorite={() => changeFavorite(item)}
                />
              ))}
            </ul>
          )}

          {(tab === 'browse' || tab === 'search') && (
            <>
              {(music.status === 'failed' || podcasts.status === 'failed') && (
                <p className={styles.empty} role="alert">
                  The sample library didn&apos;t load.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      retryMusic();
                      retryPodcasts();
                    }}
                  >
                    Retry
                  </button>
                </p>
              )}
              {collection ? (
                <>
                  <button type="button" className={styles.back} onClick={() => setCollection(null)}>
                    Back to browse
                  </button>
                  <h2 className={styles.collectionTitle}>{collection.title}</h2>
                  <ul className={styles.list}>
                    {collection.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        queue={collection.items}
                        isFavorite={favorites.includes(item.id)}
                        onFavorite={() => changeFavorite(item)}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                results.map((shelf) => (
                  <section key={shelf.id} className={styles.shelf}>
                    <h2 className={styles.shelfTitle}>{shelf.title}</h2>
                    <div className={styles.collections}>
                      {shelf.collections.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={styles.collection}
                          onClick={() => setCollection(item)}
                        >
                          <strong>{item.title}</strong>
                          <span className={styles.subtitle}>{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
              {results.length === 0 && query && (
                <p className={styles.empty}>No results for “{query}”.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
