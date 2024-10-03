import React, { useState } from 'react';
import { getImagePath } from '../../../utils/assetPaths';
import { Theater } from '../Theater/Theater';
import { Toybox } from '../Toybox/Toybox';
import { Outrun } from './Games/Outrun/Outrun';
import './Arcade.css';

export const Arcade = () => {
  const games = [
    { name: 'Outrun', image: 'outrun.jpg' },
    { name: 'Asteroids', image: 'asteroids.jpg' },
    { name: 'Centipede', image: 'centipede.jpg' },
    { name: 'Missile Command', image: 'missile-command.jpg' },
  ];

  const [activeGame, setActiveGame] = useState(games[0].name);
  const [showGame, setShowGame] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);

  const [activeTab, setActiveTab] = useState('Arcade');

  const handleGameClick = (gameName) => {
    setActiveGame(gameName);
    setShowGame(false);
  };

  const handlePlayClick = () => {
    setShowGame(true);
    setCurrentGame(activeGame);
  };

  const closeGame = () => {
    setShowGame(false);
    setCurrentGame(null);
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setShowGame(false);
    setCurrentGame(null);
  };

  return (
    <div className="arcadeWrapper">
      <div className="arcade-header">
        <div
          className={activeTab === 'Theater' ? 'active' : ''}
          onClick={() => handleTabClick('Theater')}
        >
          Theater
        </div>
        <div
          className={activeTab === 'Arcade' ? 'active' : ''}
          onClick={() => handleTabClick('Arcade')}
        >
          Arcade
        </div>
        <div
          className={activeTab === 'Toybox' ? 'active' : ''}
          onClick={() => handleTabClick('Toybox')}
        >
          Toybox
        </div>
      </div>

      {activeTab === 'Arcade' && (
        !showGame ? (
          <>
            <div className="main-game-banner">
              <img
                src={getImagePath(`games/${activeGame.toLowerCase()}.jpg`)}
                alt={activeGame}
              />
              <div className="gradient"></div>
              <div className="btnAndTitle">
                <button className="play-button" onClick={handlePlayClick}>
                  Play Game
                </button>
              <div className="gameTitle">{activeGame}</div>
              </div>
            </div>
            <div className="game-carousel">
              {games.map((game) => (
                <img
                  key={game.name}
                  src={getImagePath(`games/${game.image}`)}
                  alt={game.name}
                  onClick={() => handleGameClick(game.name)}
                  className={activeGame === game.name ? 'active' : ''}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="game-container">
            {currentGame === 'Outrun' && <Outrun onClose={closeGame} />}
            {/* Add other game components here when they're available */}
          </div>
        )
      )}

      {activeTab === 'Theater' && (
        <Theater />
      )}

      {activeTab === 'Toybox' && (
        <Toybox />
      )}
    </div>
  );
};