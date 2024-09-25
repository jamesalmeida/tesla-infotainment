import React from 'react';
import { getImagePath } from '../../utils/assetPaths';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
        <div className="displayInsideBezel">
            <div className="circle-container">
                <div class="circle"></div>
                <div class="circle-small"></div>
                <div class="circle-big"></div>
                <div class="circle-inner-inner"></div>
                <div class="circle-inner"></div>
            </div>
        <img src={getImagePath('logo-grey.svg')} alt="Tesla Logo" className="tesla-logo spinning" />
      </div>
    </div>
  );
};

export default LoadingScreen;