import React, { useState } from 'react';
import { getImagePath } from '../../../utils/assetPaths';
import { Theater } from '../Theater/Theater';
import { Toybox } from '../Toybox/Toybox';
import { Outrun } from './Games/Outrun/Outrun';
import './Arcade.css';

export const Arcade = () => {
  const games = [
    { name: 'Outrun', boxArt: 'outrun.jpg', description: '(Keyboard required) Race against time and other cars to complete the course before time runs out! Thanks to Patrick Stillhart for sharing this on Codepen. Link in the README.' },
    { name: 'DOOM', boxArt: 'doom.jpg', description: 'Coming Soon? Can it run DOOM? W\'ll see if I can get it to work. (づ￣ ³￣)づ' },
    { name: 'Asteroids', boxArt: 'asteroids.jpg', description: 'Coming Soon! Asteroids is a space combat game where you navigate a spaceship and destroy asteroids and enemy ships.' },
    { name: 'Centipede', boxArt: 'centipede.jpg', description: 'Coming Soon! Centipede is a shooter game where you control a centipede and shoot at enemies and avoid their attacks.' },
    { name: 'Missile Command', boxArt: 'missile-command.jpg', description: 'Coming Soon! Missile Command is a classic arcade game where you control a missile defense system and shoot at incoming missiles.' },
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
                src={getImagePath(`games/${activeGame.toLowerCase().replace(/\s+/g, '-')}-banner.jpg`)}
                alt={activeGame}
              />
              <div className="gradient"></div>
              <div className="activeGameBannerOverlay">
                <div className="play-button ctaBtn" onClick={handlePlayClick}>
                  Play Game
                </div>
                <div className="gameInfo">
                  <div className="gameTitle">{activeGame}</div>
                  <div className="gameDescription">{games.find(game => game.name === activeGame).description}</div>
                </div>
              </div>
            </div>
            <div className="game-carousel">
              {games.map((game) => (
                <img
                  key={game.name}
                  src={getImagePath(`games/${game.boxArt}`)}
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