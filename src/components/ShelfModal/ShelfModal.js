import React from 'react';
import './ShelfModal.css';

export const ShelfModal = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="shelf-modal-overlay">
      <div className="shelf-modal">
        <h2>App Shelf</h2>
        {/* Add shelf content here */}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};