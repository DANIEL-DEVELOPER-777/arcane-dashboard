import React from "react";
import { Link } from "wouter";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Could add logging here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-xl text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-zinc-400 mb-6">An unexpected error occurred while rendering this page.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-white text-black font-semibold">Reload</button>
              <Link href="/accounts" className="px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10">Back to accounts</Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
