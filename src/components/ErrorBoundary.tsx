import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
          <div className="max-w-md w-full bg-slate-800 border border-red-500/50 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-400 mb-4">
              Произошла ошибка
            </h1>
            <p className="text-slate-300 mb-4">
              Приложение столкнулось с неожиданной ошибкой. Пожалуйста, обновите страницу.
            </p>
            
            {this.state.error && (
              <div className="mb-4 p-3 bg-slate-900 rounded text-sm">
                <p className="text-red-400 font-mono mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-slate-400 text-xs">
                    <summary className="cursor-pointer mb-2">Детали ошибки</summary>
                    <pre className="overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-900 font-medium py-2 rounded-lg transition"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

