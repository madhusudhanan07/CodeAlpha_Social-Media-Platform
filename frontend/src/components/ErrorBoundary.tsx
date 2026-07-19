import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: '#e74c3c' }}>Something went wrong.</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '600px', lineHeight: 1.6 }}>
            We're sorry, but an unexpected error occurred. Our team has been notified.
            <br /><br />
            <code>{this.state.error?.message}</code>
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '0.75rem 2rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '24px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s' }}
            >
              Refresh Page
            </button>
            <Link to="/" style={{ padding: '0.75rem 2rem', background: 'var(--primary-color)', color: '#fff', borderRadius: '24px', textDecoration: 'none', fontWeight: 600, transition: 'background 0.3s' }}>
              Return to Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
