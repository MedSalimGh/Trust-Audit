import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
          <AlertOctagon className="h-10 w-10 text-red-400 mb-4" />
          <h3 className="text-lg font-display font-semibold text-slate-200 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-slate-400 max-w-md mb-1">
            An unexpected error occurred in this section.
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400/70 font-mono max-w-md mb-4 break-all">
              {this.state.error.message}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={this.handleReset} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
