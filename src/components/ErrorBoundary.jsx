import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Vouch crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-card p-6">
          <p className="text-sm font-semibold text-red-600 mb-2">Something went wrong</p>
          <p className="text-xs text-slate-600 mb-3">{String(this.state.error?.message || this.state.error)}</p>
          <pre className="text-[10px] text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-3 mb-4">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.href = '/';
            }}
            className="bg-ink-950 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }
}
