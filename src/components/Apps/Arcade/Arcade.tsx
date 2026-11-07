import { lazy, Suspense, useReducer, useState } from 'react';
import { useCarState } from '../../../state/CarStateContext';
import { getImagePath } from '../../../utils/assetPaths';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner';
import { arcadeReducer, type ArcadeView } from './arcadeView';
import { ChunkBoundary } from './ChunkBoundary';
import { games, type ArcadeGame } from './games';
import styles from './Arcade.module.css';

const Theater = lazy(() =>
  import('../Theater/Theater').then((module) => ({ default: module.Theater })),
);
const Toybox = lazy(() =>
  import('../Toybox/Toybox').then((module) => ({ default: module.Toybox })),
);

const TABS = ['Theater', 'Arcade', 'Toybox'] as const;
type ArcadeTab = (typeof TABS)[number];

const gameById = (id: ArcadeGame['id']): ArcadeGame => {
  const game = games.find((candidate) => candidate.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
};

const playLabel = (game: ArcadeGame, isParked: boolean): string => {
  if (!game.component) return 'Coming soon';
  return isParked ? 'Play Game' : 'Shift to Park';
};

export const Arcade = () => {
  const { gear } = useCarState();
  const isParked = gear === 'P';
  const [view, dispatch] = useReducer(arcadeReducer, {
    kind: 'browse',
    selected: games[0].id,
  } satisfies ArcadeView);
  const [activeTab, setActiveTab] = useState<ArcadeTab>('Arcade');
  const close = () => dispatch({ type: 'close' });

  const handleTabClick = (tab: ArcadeTab) => {
    setActiveTab(tab);
    close();
  };

  const renderBrowse = (selectedId: ArcadeGame['id']) => {
    const selected = gameById(selectedId);
    const canPlay = Boolean(selected.component) && isParked;

    return (
      <>
        <div className={styles['main-game-banner']}>
          <img src={getImagePath(`games/${selected.id}-banner.svg`)} alt="" />
          <div className={styles.gradient}></div>
          <div className={styles.activeGameBannerOverlay}>
            <button
              type="button"
              className={`${styles['play-button']} ctaBtn`}
              disabled={!canPlay}
              onClick={() => dispatch({ type: 'play', canPlay })}
            >
              {playLabel(selected, isParked)}
            </button>
            <div className={styles.gameInfo}>
              <div className={styles.gameTitle}>{selected.name}</div>
              <div className={styles.gameDescription}>{selected.description}</div>
            </div>
          </div>
        </div>
        <div className={styles['game-carousel']}>
          {games.map((game) => (
            <img
              key={game.id}
              src={getImagePath(`games/${game.id}.svg`)}
              alt={game.name}
              onClick={() => dispatch({ type: 'select', game: game.id })}
              className={selected.id === game.id ? styles.active : ''}
            />
          ))}
        </div>
      </>
    );
  };

  const renderGame = (gameId: ArcadeGame['id']) => {
    const Game = gameById(gameId).component;
    return (
      <div className={styles['game-container']}>
        {Game && <Game onClose={close} suspended={!isParked} />}
      </div>
    );
  };

  return (
    <div className={styles.arcadeWrapper}>
      <div className={styles['arcade-header']}>
        {TABS.map((tab) => (
          <div
            key={tab}
            className={activeTab === tab ? styles.active : ''}
            onClick={() => handleTabClick(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Keyed so that going Back from a failed download clears the failure. */}
      <ChunkBoundary
        key={`${activeTab}-${view.kind}`}
        onBack={() => (view.kind === 'playing' ? close() : setActiveTab('Arcade'))}
      >
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === 'Arcade' &&
            (view.kind === 'browse' ? renderBrowse(view.selected) : renderGame(view.game))}
          {activeTab === 'Theater' && <Theater />}
          {activeTab === 'Toybox' && <Toybox />}
        </Suspense>
      </ChunkBoundary>
    </div>
  );
};
