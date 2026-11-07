import { useState } from 'react';
import {
  formatMediaTime,
  playItem,
  resumePosition,
  useNowPlaying,
  type MediaCollection,
  type MediaItem,
} from '../../../apps/mediaLibrary';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { CollectionHeader, ShelfList, ShelvesStatus } from '../../../apps/ui/MediaBrowse';
import { NowPlayingBar } from '../../../apps/ui/NowPlayingBar';
import { useMediaShelves } from '../../../apps/ui/useMediaShelves';
import styles from './Podcasts.module.css';

function EpisodeRow({ episode, queue }: { episode: MediaItem; queue: MediaItem[] }) {
  const { item, positionSeconds } = useNowPlaying();
  const isCurrent = item?.id === episode.id;
  const position = isCurrent ? positionSeconds : resumePosition(episode);
  const duration = episode.durationSeconds ?? 0;

  return (
    <li>
      <button type="button" className={ui.row} onClick={() => playItem(episode, queue)}>
        <span className={ui.rowText}>
          <span className={`${ui.strong} ${isCurrent ? styles.current : ''}`}>{episode.title}</span>
          <span className={`${ui.muted} ${styles.block}`}>{episode.description}</span>
          {position > 0 && (
            <span className={styles.progress} aria-hidden="true">
              <span style={{ width: `${(position / duration) * 100}%` }} />
            </span>
          )}
        </span>
        <span className={ui.muted}>
          {position > 0
            ? `${formatMediaTime(duration - position)} left`
            : formatMediaTime(duration)}
        </span>
      </button>
    </li>
  );
}

function Show({ show, onBack }: { show: MediaCollection; onBack: () => void }) {
  return (
    <>
      <CollectionHeader collection={show} onBack={onBack} backLabel="Shows" />
      <ul className={ui.list}>
        {show.items.map((episode) => (
          <EpisodeRow key={episode.id} episode={episode} queue={show.items} />
        ))}
      </ul>
    </>
  );
}

export const Podcasts = () => {
  const { loaded, retry } = useMediaShelves('podcasts');
  const [show, setShow] = useState<MediaCollection | null>(null);
  const { error } = useNowPlaying();

  return (
    <AppScreen title="Podcasts" fixed toolbar={<span className={ui.muted}>Sample shows</span>}>
      <div className={styles.content}>
        <ShelvesStatus loaded={loaded} retry={retry} />
        {error && <Callout tone="error">{error}</Callout>}
        {show ? (
          <Show show={show} onBack={() => setShow(null)} />
        ) : (
          loaded.status === 'ready' && <ShelfList shelves={loaded.shelves} onOpen={setShow} />
        )}
        <p className={ui.muted}>
          These shows are invented and have no audio. Each episode remembers where you stopped.
        </p>
      </div>
      <NowPlayingBar />
    </AppScreen>
  );
};
