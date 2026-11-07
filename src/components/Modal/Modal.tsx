import { useEffect, type MouseEvent, type ReactNode } from 'react';
import type { ModalId } from '../../state/carState';
import styles from './Modal.module.css';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  children?: ReactNode;
  modalType: ModalId | null;
}

export const Modal = ({ isVisible, onClose, children, modalType }: ModalProps) => {
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className={styles['modal-overlay']} onClick={handleBackdropClick}>
      <div
        className={`${styles['modal-content']} ${modalType ? styles[modalType] : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};
