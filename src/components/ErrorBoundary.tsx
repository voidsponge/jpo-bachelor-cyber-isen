import React from "react";

type Props = {
  children: React.ReactNode;
  fallback: (error: unknown) => React.ReactNode;
};

type State = { hasError: boolean; error: unknown };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Keep for debugging self-hosted issues
    console.error("ErrorBoundary caught error:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}
