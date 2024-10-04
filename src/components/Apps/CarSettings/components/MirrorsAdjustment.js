import React from 'react';

export const MirrorsAdjustment = ({ onClose }) => {
  return (
    <div className="adjustment-modal">
      <h2>Adjust Mirrors</h2>
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