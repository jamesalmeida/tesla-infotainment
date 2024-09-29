import React, { useState, useEffect } from 'react';
import { getImagePath } from '../../utils/assetPaths';
import { useDots } from '../../utils/dots';
import './LoadingScreen.css';

const loadingMessages = [
  "Charging flux capacitor",
  "Reticulating splines",
  "Calibrating autopilot",
  "Syncing with Starlink",
  "Booting up neural lace",
  "Don't panic",
  "Constructing additional pylons",
  "Proving P=NP",
  "Tokenizing real life",
  "Follow the white rabbit",
  "(Insert quarter)",
  "Counting backwards from Infinity",
  "Stay awhile... and listen",
  "Computing the secret to life, the universe, and everything",
  "Downloading your daily traffic jam",
  "Calculating optimal Hohmann transfer orbit to Mars",
  "Spooling up the hyperdrive",
  "Synchronizing with the mothership",
  "Turning on the wipers for sarcasm",
  "Putting the 'auto' in autopilot",
  "Mining Dogecoin",
  "Ensuring zero emissions and maximum fun",
  "Groking your prefered routes",
];

const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState('');
  const dots = useDots();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    setLoadingText(loadingMessages[randomIndex]);
  }, []);

  return (
    <div className="loading-screen">
      <div className="displayInsideBezel">
        <div className="circle-container">
          <div className="circle"></div>
          <div className="circle-small"></div>
          <div className="circle-big"></div>
          <div className="circle-inner-inner"></div>
          <div className="circle-inner"></div>
        </div>
        <img src={getImagePath('logo-grey.svg')} alt="Tesla Logo" className="tesla-logo spinning" />
        <p className="loading-text">{loadingText}{dots}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;