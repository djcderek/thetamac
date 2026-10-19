"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Rendering Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-2xl">
            <div className="text-center p-4">
              <div className="text-muted-foreground text-sm">
                3D preview unavailable
              </div>
              <div className="text-xs text-muted-foreground/70 mt-1">
                Your browser may not support WebGL
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
