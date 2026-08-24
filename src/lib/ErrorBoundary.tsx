import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

/**
 * ErrorBoundary class component that catches render errors in the 3D scene.
 * A WebGL/shader failure must NEVER blank the marketing page.
 * When an error occurs, renders the fallback (if provided) or null,
 * allowing the DOM content outside this boundary to remain visible.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    // Call the optional error handler if provided.
    if (this.props.onError) {
      this.props.onError(error);
    }
    // Log to console for debugging.
    console.error('ErrorBoundary caught an error:', error);
    // Do NOT send to a network endpoint — we have no error-reporting service
    // and the CSP forbids third-party origins.
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
