import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { logger } from './utils/logger';
import './index.css';

// Диагностика: проверяем импорты
console.log('[main.tsx] Компоненты импортированы');
console.log('[main.tsx] App:', typeof App);
console.log('[main.tsx] AppErrorBoundary:', typeof AppErrorBoundary);

// Глобальная обработка ошибок
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler] Поймана ошибка:', event);
  logger.error('Unhandled error', event.error instanceof Error ? event.error : undefined, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  
  // Если это критическая ошибка и приложение не рендерится, показываем fallback
  if (!document.getElementById('root')?.hasChildNodes()) {
    console.error('[Global Error Handler] Приложение не рендерится, показываем fallback');
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: linear-gradient(to bottom right, #f8fafc, #e2e8f0); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 500px; width: 100%; background: white; border: 1px solid #fecaca; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
            <div style="width: 64px; height: 64px; margin: 0 auto 24px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#dc2626">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px;">
              Критическая ошибка
            </h1>
            <p style="color: #6b7280; margin-bottom: 8px;">
              Произошла ошибка при загрузке приложения.
            </p>
            <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">
              Пожалуйста, обновите страницу или обратитесь в поддержку.
            </p>
            <button 
              onclick="window.location.reload()" 
              style="padding: 12px 24px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
              onmouseover="this.style.background='#0284c7'"
              onmouseout="this.style.background='#0ea5e9'"
            >
              🔄 Обновить страницу
            </button>
            ${import.meta.env.DEV ? `<p style="margin-top: 16px; font-size: 12px; color: #dc2626; font-family: monospace;">${event.message}</p>` : ''}
          </div>
        </div>
      `;
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Error Handler] Поймана необработанная promise rejection:', event.reason);
  logger.error('Unhandled promise rejection', event.reason instanceof Error ? event.reason : undefined);
});

if (import.meta.env.DEV) {
  logger.info('Application starting', {
    url: window.location.href,
    userAgent: navigator.userAgent
  });
  console.log('[main.tsx] Приложение запускается...');
  console.log('[main.tsx] React версия:', React.version);
  console.log('[main.tsx] Режим:', import.meta.env.MODE);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[main.tsx] ❌ Root element не найден!');
  logger.error('Root element not found');
  throw new Error('Root element not found');
}

console.log('[main.tsx] ✅ Root element найден');

// Проверяем, что React и ReactDOM инициализированы
if (!React || !ReactDOM) {
  logger.error('React or ReactDOM is not available');
  throw new Error('React or ReactDOM is not available');
}

try {
  // Отключен StrictMode из-за известной проблемы в React 19.2.0+
  // TODO: Включить обратно после обновления React или исправления проблемы
  // React.StrictMode вызывает ошибку "Cannot set properties of undefined (setting 'Activity')"
  // Это известный баг в React 19, связанный с внутренними механизмами отслеживания компонентов
  
  // Диагностика: проверяем, что AppErrorBoundary импортирован
  if (!AppErrorBoundary) {
    throw new Error('AppErrorBoundary не импортирован');
  }
  
  console.log('[main.tsx] Инициализация React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('[main.tsx] Рендеринг приложения с AppErrorBoundary...');
  
  // Верхнеуровневый ErrorBoundary оборачивает всё приложение
  // для предотвращения "white screen of death" при любых необработанных ошибках
  root.render(
    <AppErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: 'var(--toast-color, #000)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AppErrorBoundary>
  );
  
  console.log('[main.tsx] Рендеринг завершён');
  
  if (import.meta.env.DEV) {
    logger.info('App rendered successfully');
  }
} catch (error) {
  // Критическая ошибка при инициализации React (до рендеринга)
  // ErrorBoundary не может поймать такие ошибки, поэтому обрабатываем их отдельно
  logger.error('Failed to render app (critical initialization error)', error instanceof Error ? error : undefined);
  
  // Показываем пользователю понятное сообщение об ошибке
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: linear-gradient(to bottom right, #f8fafc, #e2e8f0); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 500px; width: 100%; background: white; border: 1px solid #fecaca; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
        <div style="width: 64px; height: 64px; margin: 0 auto 24px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#dc2626">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 16px;">
          Ошибка загрузки приложения
        </h1>
        <p style="color: #6b7280; margin-bottom: 8px;">
          Не удалось инициализировать приложение.
        </p>
        <p style="color: #6b7280; margin-bottom: 24px; font-size: 14px;">
          Пожалуйста, обновите страницу или обратитесь в поддержку.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="padding: 12px 24px; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
          onmouseover="this.style.background='#0284c7'"
          onmouseout="this.style.background='#0ea5e9'"
        >
          🔄 Обновить страницу
        </button>
      </div>
    </div>
  `;
}
