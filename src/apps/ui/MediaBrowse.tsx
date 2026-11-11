import type { MediaCollection, MediaShelf } from '../mediaLibrary';
import { Callout, ui } from './AppScreen';
import { MediaArt } from './MediaArt';
import type { useMediaShelves } from './useMediaShelves';
import styles from './MediaBrowse.module.css';

export function CollectionTile({
  collection,
  onOpen,
}: {
  collection: MediaCollection;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <MediaArt artworkUrl={collection.artworkUrl} seed={collection.id} className={styles.art} />
      <span className={`${ui.strong} ${styles.block}`}>{collection.title}</span>
      <span className={`${ui.muted} ${styles.block}`}>{collection.subtitle}</span>
    </button>
  );
}

export function ShelfList({
  shelves,
  onOpen,
}: {
  shelves: MediaShelf[];
  onOpen: (collection: MediaCollection) => void;
}) {
  return shelves.map((shelf) => (
    <section key={shelf.id} aria-label={shelf.title}>
      <h3 className={ui.sectionTitle}>{shelf.title}</h3>
      <div className={styles.grid}>
        {shelf.collections.map((collection) => (
          <CollectionTile
            key={collection.id}
            collection={collection}
            onOpen={() => onOpen(collection)}
          />
        ))}
      </div>
    </section>
  ));
}

export function CollectionHeader({
  collection,
  onBack,
  backLabel,
}: {
  collection: MediaCollection;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className={styles.collectionHeader}>
      <button type="button" className={ui.button} onClick={onBack}>
        ‹ {backLabel}
      </button>
      <MediaArt
        artworkUrl={collection.artworkUrl}
        seed={collection.id}
        className={styles.headerArt}
      />
      <div className={ui.rowText}>
        <h3 className={styles.collectionTitle}>{collection.title}</h3>
        <div className={ui.muted}>{collection.subtitle}</div>
      </div>
    </div>
  );
}

export function ShelvesStatus({
  loaded,
  retry,
}: {
  loaded: ReturnType<typeof useMediaShelves>['loaded'];
  retry: () => void;
}) {
  if (loaded.status === 'loading') return <div className={ui.muted}>Loading…</div>;
  if (loaded.status === 'failed') {
    return (
      <Callout
        tone="error"
        action={
          <button type="button" className={ui.button} onClick={retry}>
            Try again
          </button>
        }
      >
        This library couldn&apos;t be loaded.
      </Callout>
    );
  }
  return null;
}
