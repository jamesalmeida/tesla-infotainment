import React from 'react';
import './CarWashMode.css';

export default function CarWashMode({ onClose }) {
  return (
    <div className="car-wash-mode-container">
      <div className="car-wash-mode-header">
        <div className="car-wash-mode-title">Car Wash Mode</div>
      <div className="car-wash-mode-content">Coming Soon</div>
        <div className="close-button ctaBtn" onClick={onClose}>
          Exit Car Wash Mode
        </div>
      </div>
    </div>
  );
}