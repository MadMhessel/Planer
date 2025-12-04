import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Верхнеуровневый Error Boundary для всего приложения
 * 
 * Ловит все необработанные ошибки в React-дереве и показывает
 * понятный fallback UI вместо белого экрана.
 * 
 * В dev-режиме показывает детали ошибки для разработчика.
 * В prod-режиме показывает дружелюбное сообщение для пользователя.
 * 
 * TODO: Для production можно подключить внешние сервисы логирования:
 * - Sentry: Sentry.captureException(error, { extra: errorInfo });
 * - LogRocket: LogRocket.captureException(error);
 * - Custom API: отправка ошибок на backend для анализа
 */
class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Обновляем состояние, чтобы показать fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null // errorInfo будет установлен в componentDidCatch
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку для отладки
    const isDev = import.meta.env.DEV;
    
    // Всегда логируем в консоль
    console.error('🚨 AppErrorBoundary caught an error:', error);
    console.error('Error details:', errorInfo);
    
    // Используем централизованный logger
    try {
      logger.error(
        'Uncaught error in React component tree',
        error,
        {
          componentStack: errorInfo.componentStack,
          errorBoundary: 'AppErrorBoundary',
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown'
        }
      );
    } catch (logError) {
      // Если logger сам упал, хотя бы console.error
      console.error('Failed to log error:', logError);
    }

    // TODO: Подключение внешних сервисов логирования
    // 
    // Пример для Sentry:
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack
    //       }
    //     },
    //     tags: {
    //       errorBoundary: 'AppErrorBoundary'
    //     }
    //   });
    // }
    //
    // Пример для LogRocket:
    // if (typeof window !== 'undefined' && (window as any).LogRocket) {
    //   (window as any).LogRocket.captureException(error, {
    //     tags: { errorBoundary: 'AppErrorBoundary' },
    //     extra: { componentStack: errorInfo.componentStack }
    //   });
    // }
    //
    // Пример для отправки на backend:
    // if (!isDev && typeof window !== 'undefined') {
    //   fetch('/api/errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       message: error.message,
    //       stack: error.stack,
    //       componentStack: errorInfo.componentStack,
    //       userAgent: window.navigator.userAgent,
    //       url: window.location.href,
    //       timestamp: new Date().toISOString()
    //     })
    //   }).catch(err => console.error('Failed to send error to backend:', err));
    // }

    // Сохраняем errorInfo в state для отображения в dev-режиме
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Принудительная перезагрузка страницы
    window.location.reload();
  };

  handleReset = () => {
    // Попытка сбросить состояние ошибки (может помочь при временных проблемах)
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      const { error, errorInfo } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 rounded-xl shadow-xl p-6 md:p-8">
            {/* Иконка ошибки */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Заголовок */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 text-center mb-4">
              Произошла непредвиденная ошибка
            </h1>

            {/* Описание для пользователя */}
            <p className="text-gray-700 dark:text-slate-300 text-center mb-2">
              Приложение столкнулось с неожиданной проблемой.
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400 text-center mb-8">
              Попробуйте обновить страницу. Если ошибка повторяется, пожалуйста, сообщите в поддержку.
            </p>

            {/* Детали ошибки (только в dev-режиме) */}
            {isDev && error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30">
                <h2 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
                  🔍 Детали ошибки (только в dev-режиме):
                </h2>
                
                {/* Сообщение об ошибке */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Сообщение:
                  </p>
                  <p className="text-sm font-mono text-red-700 dark:text-red-400 break-words">
                    {error.message || 'Unknown error'}
                  </p>
                </div>

                {/* Stack trace */}
                {error.stack && (
                  <details className="mb-3">
                    <summary className="text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 mb-1">
                      Stack trace (нажмите для раскрытия)
                    </summary>
                    <pre className="mt-2 text-xs font-mono text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700 overflow-auto max-h-48">
                      {error.stack}
                    </pre>
                  </details>
                )}

                {/* Component stack */}
                {errorInfo?.componentStack && (
                  <details>
                    <summary className="text-xs font-medium text-gray-700 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-slate-100 mb-1">
                      Component stack (нажмите для раскрытия)
                    </summary>
                    <pre className="mt-2 text-xs font-mono text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700 overflow-auto max-h-48">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                🔄 Обновить страницу
              </button>
              
              {isDev && (
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-medium rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  🔁 Попробовать снова
                </button>
              )}
            </div>

            {/* Дополнительная информация в dev-режиме */}
            {isDev && (
              <p className="mt-6 text-xs text-center text-gray-500 dark:text-slate-400">
                💡 Подсказка: Проверьте консоль браузера для дополнительной информации об ошибке.
              </p>
            )}
          </div>
        </div>
      );
    }

    // Если ошибки нет, рендерим дочерние компоненты
    return this.props.children;
  }
}

export default AppErrorBoundary;

