import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

export interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  resetKey: number;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Galton Studio could not start the board.', error, info);
  }

  private retry = () => {
    this.setState(({ resetKey }) => ({ error: null, resetKey: resetKey + 1 }));
  };

  render() {
    const { error, resetKey } = this.state;
    if (error) {
      return (
        <main className="app-fallback">
          <section className="app-fallback__panel" aria-labelledby="board-error-heading">
            <p className="eyebrow">Galton Studio</p>
            <h1 id="board-error-heading">The board could not start</h1>
            <p>The experiment is safe to try again. Your browser may only need a fresh start.</p>
            <button className="button button--primary" type="button" onClick={this.retry}>Retry</button>
          </section>
        </main>
      );
    }

    return <Fragment key={resetKey}>{this.props.children}</Fragment>;
  }
}
