import { Component } from "react";
import logger from "../lib/logger";

// Root error boundary so a single render error shows a recoverable fallback
// instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logger.error("Unhandled UI error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#eef7fa] px-4 text-center">
        <h1 className="text-2xl font-semibold text-[#245f6d]">Something went wrong</h1>
        <p className="mt-3 max-w-md text-sm text-neutral-600">
          The page hit an unexpected error. Try reloading — if it keeps happening,
          contact support.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-6 rounded-md bg-[#1f6573] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#174f5b]"
        >
          Reload
        </button>
      </div>
    );
  }
}
