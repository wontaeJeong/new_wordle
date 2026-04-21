import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorReporting } from './lib/errorReporting';
import { logger } from './lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Application crashed', { error, errorInfo });
    errorReporting.capture(error, { componentStack: errorInfo.componentStack });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="crash-shell" role="alert">
          <div className="crash-card">
            <h1>Something went wrong.</h1>
            <p>The app hit an unexpected error. Reload to start a clean session.</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
