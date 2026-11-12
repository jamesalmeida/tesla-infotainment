import { useState } from 'react';
import { formatMediaTime, playItem, useNowPlaying } from '../../../apps/mediaLibrary';
import type { MediaCollection } from '../../../apps/mediaLibrary';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { CollectionHeader, ShelfList, ShelvesStatus } from '../../../apps/ui/MediaBrowse';
import { useMediaShelves } from '../../../apps/ui/useMediaShelves';
import styles from './AppleMusic.module.css';

function Album({ album, onBack }: { album: MediaCollection; onBack: () => void }) {
  const { item: current } = useNowPlaying();

  return (
    <>
      <CollectionHeader collection={album} onBack={onBack} backLabel="Browse" />
      <ol className={ui.list}>
        {album.items.map((track, index) => (
          <li key={track.id}>
            <button
              type="button"
              className={ui.row}
              aria-current={track.id === current?.id ? 'true' : undefined}
              onClick={() => playItem(track, album.items)}
            >
              <span className={ui.muted}>{index + 1}</span>
              <span className={`${ui.rowText} ${track.id === current?.id ? styles.current : ''}`}>
                {track.title}
              </span>
              <span className={ui.muted}>{formatMediaTime(track.durationSeconds ?? 0)}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

// The screen says Music, not the service: this is a mock with no account behind it.
export const AppleMusic = () => {
  const { loaded, retry } = useMediaShelves('music');
  const [album, setAlbum] = useState<MediaCollection | null>(null);
  const { error } = useNowPlaying();

  return (
    <AppScreen title="Music" fixed toolbar={<span className={ui.muted}>Sample library</span>}>
      <div className={styles.content}>
        <ShelvesStatus loaded={loaded} retry={retry} />
        {error && <Callout tone="error">{error}</Callout>}
        {album ? (
          <Album album={album} onBack={() => setAlbum(null)} />
        ) : (
          loaded.status === 'ready' && <ShelfList shelves={loaded.shelves} onOpen={setAlbum} />
        )}
        <p className={ui.muted}>
          These artists and albums are invented and have no audio. The timer still runs, so you can
          try the controls.
        </p>
      </div>
    </AppScreen>
  );
};
