import React from 'react';
import { getImagePath } from '../../utils/assetPaths';
import './LoadingScreen.css';

const LoadingScreen = () => {
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
      </div>
    </div>
  );
};

export default LoadingScreen;