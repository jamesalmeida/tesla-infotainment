import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { playItem, useNowPlaying } from '../../../apps/mediaLibrary';
import { AppScreen, Callout, Tabs, ui } from '../../../apps/ui/AppScreen';
import { GeneratedArt } from '../../../apps/ui/GeneratedArt';
import { NowPlayingBar } from '../../../apps/ui/NowPlayingBar';
import {
  fetchStations,
  GENRES,
  loadFavourites,
  saveFavourites,
  toggleFavourite,
  toMediaItem,
  type Station,
  type StationQuery,
} from './stations';
import styles from './Radio.module.css';

const TABS = [
  { id: 'stations', label: 'Stations' },
  { id: 'favourites', label: 'Favourites' },
] as const;

type Tab = (typeof TABS)[number]['id'];

type Results =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; stations: Station[] };

function useStations(query: StationQuery) {
  const [results, setResults] = useState<Results>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { name, tag } = query;

  useEffect(() => {
    let isCurrent = true;
    fetchStations({ name, tag })
      .then((stations) => {
        if (isCurrent) setResults({ status: 'ready', stations });
      })
      .catch(() => {
        if (isCurrent) setResults({ status: 'failed' });
      });
    return () => {
      isCurrent = false;
    };
  }, [name, tag, attempt]);

  const retry = useCallback(() => {
    setResults({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { results, retry };
}

function StationRow({
  station,
  queue,
  isFavourite,
  onToggleFavourite,
}: {
  station: Station;
  queue: Station[];
  isFavourite: boolean;
  onToggleFavourite: () => void;
}) {
  const { item } = useNowPlaying();
  const media = toMediaItem(station);
  const isCurrent = item?.id === media.id;

  return (
    <li className={styles.station}>
      <button
        type="button"
        className={ui.row}
        aria-current={isCurrent ? 'true' : undefined}
        onClick={() => playItem(media, queue.map(toMediaItem))}
      >
        <GeneratedArt seed={media.collectionId} className={styles.art} />
        <span className={ui.rowText}>
          <span className={`${ui.strong} ${isCurrent ? styles.current : ''}`}>{station.name}</span>
          <span className={`${ui.muted} ${styles.block}`}>
            {[station.place, station.tags].filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={ui.button}
        aria-pressed={isFavourite}
        aria-label={`${isFavourite ? 'Remove' : 'Add'} ${station.name} ${isFavourite ? 'from' : 'to'} favourites`}
        onClick={onToggleFavourite}
      >
        {isFavourite ? '★' : '☆'}
      </button>
    </li>
  );
}

export const Radio = () => {
  const [tab, setTab] = useState<Tab>('stations');
  const [genre, setGenre] = useState(GENRES[0]);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [favourites, setFavourites] = useState(loadFavourites);
  const { error } = useNowPlaying();

  const { results, retry } = useStations({
    name: name || undefined,
    tag: name || genre === GENRES[0] ? undefined : genre,
  });

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setName(draft.trim());
  };

  const toggle = (station: Station) => {
    const next = toggleFavourite(favourites, station);
    saveFavourites(next);
    setFavourites(next);
  };

  const stationList = (stations: Station[]) => (
    <ul className={ui.list}>
      {stations.map((station) => (
        <StationRow
          key={station.id}
          station={station}
          queue={stations}
          isFavourite={favourites.some((item) => item.id === station.id)}
          onToggleFavourite={() => toggle(station)}
        />
      ))}
    </ul>
  );

  return (
    <AppScreen
      title="Radio"
      fixed
      toolbar={<Tabs tabs={TABS} value={tab} onChange={setTab} label="Radio views" />}
    >
      <div className={styles.content}>
        {error && <Callout tone="error">{error} Try another station.</Callout>}
        {tab === 'favourites' &&
          (favourites.length === 0 ? (
            <div className={ui.muted}>No favourites yet. Tap the star beside a station.</div>
          ) : (
            stationList(favourites)
          ))}
        {tab === 'stations' && (
          <div className={ui.stack}>
            <form className={ui.inline} onSubmit={handleSearch}>
              <input
                className={ui.input}
                type="search"
                aria-label="Search stations"
                placeholder="Search stations"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" className={ui.button}>
                Search
              </button>
            </form>
            <div className={ui.inline}>
              {GENRES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={!name && item === genre}
                  className={`${ui.button} ${!name && item === genre ? ui.primary : ''}`}
                  onClick={() => {
                    setName('');
                    setDraft('');
                    setGenre(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {results.status === 'loading' && <div className={ui.muted}>Finding stations…</div>}
            {results.status === 'failed' && (
              <Callout
                tone="error"
                action={
                  <button type="button" className={ui.button} onClick={retry}>
                    Try again
                  </button>
                }
              >
                The radio directory can&apos;t be reached. You may be offline, or your network may
                be blocking it.
              </Callout>
            )}
            {results.status === 'ready' &&
              (results.stations.length === 0 ? (
                <div className={ui.muted}>No stations found.</div>
              ) : (
                stationList(results.stations)
              ))}
            <p className={ui.muted}>
              Stations come from the free Radio Browser directory. They are run by third parties,
              and some may be down.
            </p>
          </div>
        )}
      </div>
      <NowPlayingBar />
    </AppScreen>
  );
};
