import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  // Receives a function that clears the error and renders the children again.
  fallback: (retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Display error', error, info.componentStack);
    this.props.onError?.(error);
  }

  retry = () => this.setState({ hasError: false });

  render() {
    return this.state.hasError ? this.props.fallback(this.retry) : this.props.children;
  }
}
