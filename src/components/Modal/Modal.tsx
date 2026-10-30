import type { ReactNode } from 'react';
import type { ModalId } from '../../state/carState';
import styles from './Modal.module.css';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  children?: ReactNode;
  modalType: ModalId | null;
}

export const Modal = ({ isVisible, onClose: _onClose, children, modalType }: ModalProps) => {
  if (!isVisible) return null;

  return (
    <div className={`${styles['modal-overlay']} ${modalType}`}>
      <div className={`${styles['modal-content']} ${modalType && styles[modalType]}`}>
        {children}
        {/* <button className="modal-close" onClick={onClose}>Close</button> */}
      </div>
    </div>
  );
};
