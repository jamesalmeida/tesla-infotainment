import React from 'react';

export const SteeringAdjustment = ({ onClose }) => {
  return (
    <div className="adjustment-modal">
      <h2>Adjust Steering Wheel</h2>
      <div className="adjustment-controls">
        <button className="adjustment-btn">↑</button>
        <button className="adjustment-btn">↓</button>
        <button className="adjustment-btn">←</button>
        <button className="adjustment-btn">→</button>
      </div>
      <button className="close-btn" onClick={onClose}>Close</button>
    </div>
  );
};