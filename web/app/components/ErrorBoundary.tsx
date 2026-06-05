"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#071326] flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-[22px] border border-white/10 bg-white/5 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white/90 mb-2">
              Đã xảy ra lỗi
            </h1>
            <p className="text-blue-200/70 mb-6">
              {this.state.error?.message || "Có lỗi không mong muốn xảy ra"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-6 py-3 text-sm font-medium text-white/90 hover:bg-[#1a6cb8] transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
