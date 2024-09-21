import React from 'react';
import './Modal.css';

export const Modal = ({ isVisible, onClose, children, modalType }) => {
  if (!isVisible) return null;

  return (
    <div className={`modal-overlay ${modalType}`}>
      <div className={`modal-content ${modalType}`}>
        {children}
        {/* <button className="modal-close" onClick={onClose}>Close</button> */}
      </div>
    </div>
  );
};