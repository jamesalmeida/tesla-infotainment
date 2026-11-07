import { Component, type ReactNode } from 'react';
import styles from './Arcade.module.css';

interface ChunkBoundaryProps {
  onBack: () => void;
  children: ReactNode;
}

// A lazy chunk can fail to download (no signal, or a newer deploy replaced it). React keeps
// that failure for the rest of the page's life, so only a reload can retry it.
export class ChunkBoundary extends Component<ChunkBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.loadFailed} role="alert">
        <p>This couldn't be loaded. Check the connection, then reload the page.</p>
        <button type="button" className={styles['play-button']} onClick={this.props.onBack}>
          Back
        </button>
      </div>
    );
  }
}
