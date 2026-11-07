import { lazy, Suspense, useRef, useState } from 'react';
import { APPS, type AppId } from '../../apps/registry';
import { useDragToDismiss } from '../../hooks/useDragToDismiss';
import { AppFailed } from '../ErrorBoundary/Fallbacks';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import styles from './VerticalSliderPanel.module.css';

function AppContent({ app }: { app: AppId }) {
  const [attempt, setAttempt] = useState(0);
  // React.lazy remembers a failed import forever, so a retry needs a fresh lazy component.
  const [Component, setComponent] = useState(() => lazy(APPS[app].load));

  return (
    <ErrorBoundary
      key={attempt}
      fallback={() => (
        <AppFailed
          onRetry={() => {
            setComponent(() => lazy(APPS[app].load));
            setAttempt((count) => count + 1);
          }}
        />
      )}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

interface VerticalSliderPanelProps {
  isOpen: boolean;
  activeApp?: AppId | null;
  // False while the surface can't be closed, which is the camera in Reverse.
  canDismiss?: boolean;
  onClose: () => void;
}

const VerticalSliderPanel = ({
  isOpen,
  activeApp,
  canDismiss = true,
  onClose,
}: VerticalSliderPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { isDragging, handleProps } = useDragToDismiss(panelRef, onClose);

  const className = [
    styles['vertical-slider-panel'],
    isOpen ? styles.open : '',
    isDragging ? styles.dragging : '',
    activeApp === 'camera' ? styles['camera-background'] : '',
  ].join(' ');

  return (
    <div ref={panelRef} className={className}>
      {canDismiss ? (
        <div className={styles['slider-handle-area']} {...handleProps}>
          <div className={styles['slider-handle']}></div>
        </div>
      ) : (
        <div className={styles['slider-handle-spacer']}></div>
      )}
      <div className={styles['slider-content']}>
        {activeApp && <AppContent key={activeApp} app={activeApp} />}
      </div>
    </div>
  );
};

export default VerticalSliderPanel;
